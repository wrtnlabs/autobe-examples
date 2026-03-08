import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminAtSummaryTransformer } from "../transformers/DiscussionBoardAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdmins(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.grade && { grade: props.body.grade }),
    ...(props.body.display_name && {
      display_name: {
        contains: props.body.display_name,
        mode: "insensitive",
      },
    }),
    ...(props.body.email && {
      email: {
        contains: props.body.email,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.discussion_board_adminsWhereInput;
  const orderByInput = props.body.sort_by
    ? ({
        [props.body.sort_by]: props.body.sort_order ?? "desc",
      } satisfies Prisma.discussion_board_adminsOrderByWithRelationInput)
    : ({
        created_at: "desc",
      } satisfies Prisma.discussion_board_adminsOrderByWithRelationInput);
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_admins.count({
      where: whereInput,
    }),
  ]);
  const records = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdminAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: records,
  } satisfies IPageIDiscussionBoardAdmin.ISummary;
}
