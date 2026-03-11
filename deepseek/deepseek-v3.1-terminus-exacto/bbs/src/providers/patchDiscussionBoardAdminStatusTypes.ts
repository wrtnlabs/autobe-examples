import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusType";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusTypeAtSummaryTransformer } from "../transformers/DiscussionBoardStatusTypeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminStatusTypes(props: {
  admin: AdminPayload;
  body: IDiscussionBoardStatusType.IRequest;
}): Promise<IPageIDiscussionBoardStatusType.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.category !== undefined &&
      props.body.category !== null && {
        category: { contains: props.body.category },
      }),
    ...(props.body.code !== undefined &&
      props.body.code !== null && {
        code: { contains: props.body.code },
      }),
    ...(props.body.isActive !== undefined &&
      props.body.isActive !== null && {
        is_active: props.body.isActive,
      }),
  } satisfies Prisma.discussion_board_status_typesWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_status_types.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { display_order: "asc" as const },
      ...DiscussionBoardStatusTypeAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_status_types.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardStatusTypeAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
