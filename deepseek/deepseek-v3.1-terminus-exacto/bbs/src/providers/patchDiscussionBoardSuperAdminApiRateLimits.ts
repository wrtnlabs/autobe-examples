import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardApiRateLimitAtSummaryTransformer } from "../transformers/DiscussionBoardApiRateLimitAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminApiRateLimits(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardApiRateLimit.IRequest;
}): Promise<IPageIDiscussionBoardApiRateLimit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with comprehensive filtering respecting soft delete
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      endpoint_path: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.endpoint_path !== undefined && {
      endpoint_path: props.body.endpoint_path,
    }),
    ...(props.body.http_method !== undefined && {
      http_method: props.body.http_method,
    }),
    ...(props.body.rate_limit_type !== undefined && {
      rate_limit_type: props.body.rate_limit_type,
    }),
    ...(props.body.enforcement_action !== undefined && {
      enforcement_action: props.body.enforcement_action,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
  } satisfies Prisma.discussion_board_api_rate_limitsWhereInput;
  // Define default ordering by creation date
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.discussion_board_api_rate_limitsOrderByWithRelationInput;
  // Execute parallel queries for performance optimization
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_api_rate_limits.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardApiRateLimitAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_api_rate_limits.count({
      where: whereInput,
    }),
  ]);
  // Transform database records to DTOs
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardApiRateLimitAtSummaryTransformer.transform,
  );
  // Return paginated response with correct IPagination property names
  return {
    data: transformedData,
    pagination: {
      page: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages:
        total > 0 ? Math.ceil(total / limit) : (0 satisfies number as number),
    } satisfies IPage.IPagination,
  };
}
