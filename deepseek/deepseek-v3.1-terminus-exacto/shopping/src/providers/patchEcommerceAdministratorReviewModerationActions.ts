import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewModerationAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceReviewModerationActionAtSummaryTransformer } from "../transformers/EcommerceReviewModerationActionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorReviewModerationActions(props: {
  administrator: AdministratorPayload;
  body: IEcommerceReviewModerationAction.IRequest;
}): Promise<IPageIEcommerceReviewModerationAction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build filter conditions - only include when value is provided and not null
  const whereInput: Prisma.ecommerce_review_moderation_actionsWhereInput = {};
  if (props.body.action_type !== undefined && props.body.action_type !== null) {
    whereInput.action_type = props.body.action_type;
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    whereInput.status = props.body.status;
  }
  if (
    props.body.administrator_id !== undefined &&
    props.body.administrator_id !== null
  ) {
    whereInput.ecommerce_administrator_id = props.body.administrator_id;
  }
  if (props.body.review_id !== undefined && props.body.review_id !== null) {
    whereInput.ecommerce_review_id = props.body.review_id;
  }
  // Handle date range filtering
  const createdAtFilter: Record<string, unknown> = {};
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  // Get paginated data
  const data =
    await MyGlobal.prisma.ecommerce_review_moderation_actions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceReviewModerationActionAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_review_moderation_actions.count(
    {
      where: whereInput,
    },
  );
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceReviewModerationActionAtSummaryTransformer.transform,
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
