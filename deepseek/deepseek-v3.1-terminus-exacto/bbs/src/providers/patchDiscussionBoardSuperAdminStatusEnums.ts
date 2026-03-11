import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusEnumAtSummaryTransformer } from "../transformers/DiscussionBoardStatusEnumAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminStatusEnums(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardStatusEnum.IRequest;
}): Promise<IPageIDiscussionBoardStatusEnum.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause based on filters
  const whereInput: Prisma.discussion_board_status_enumsWhereInput = {
    deleted_at: null, // Only non-deleted records
  };
  // Apply filters if provided
  if (props.body.entity_type !== undefined) {
    whereInput.entity_type = props.body.entity_type;
  }
  if (props.body.value !== undefined) {
    whereInput.value = { contains: props.body.value };
  }
  if (props.body.is_active !== undefined) {
    whereInput.is_active = props.body.is_active;
  }
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_status_enums.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { sort_order: "asc" },
      ...DiscussionBoardStatusEnumAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_status_enums.count({
      where: whereInput,
    }),
  ]);
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardStatusEnumAtSummaryTransformer.transform,
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
