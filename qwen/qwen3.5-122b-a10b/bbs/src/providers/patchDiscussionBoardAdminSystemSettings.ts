import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemSettingAtSummaryTransformer } from "../transformers/DiscussionBoardSystemSettingAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSystemSettings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemSetting.IRequest;
}): Promise<IPageIDiscussionBoardSystemSetting.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_system_settingsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { key: { contains: props.body.search } },
        { value: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
    ...(props.body.key && { key: props.body.key }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.updated_at_from && {
      updated_at: { gte: new Date(props.body.updated_at_from) },
    }),
    ...(props.body.updated_at_to && {
      updated_at: { lte: new Date(props.body.updated_at_to) },
    }),
  } satisfies Prisma.discussion_board_system_settingsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_settings.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardSystemSettingAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_system_settings.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardSystemSettingAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
