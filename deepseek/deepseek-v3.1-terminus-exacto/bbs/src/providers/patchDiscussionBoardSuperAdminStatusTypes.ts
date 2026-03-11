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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusTypeAtSummaryTransformer } from "../transformers/DiscussionBoardStatusTypeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminStatusTypes(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardStatusType.IRequest;
}): Promise<IPageIDiscussionBoardStatusType.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.discussion_board_status_typesWhereInput = {
    deleted_at: null,
    ...(props.body.category && { category: { contains: props.body.category } }),
    ...(props.body.code && { code: { contains: props.body.code } }),
    ...(props.body.isActive !== undefined &&
      props.body.isActive !== null && {
        is_active: props.body.isActive,
      }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_status_types.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
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
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
