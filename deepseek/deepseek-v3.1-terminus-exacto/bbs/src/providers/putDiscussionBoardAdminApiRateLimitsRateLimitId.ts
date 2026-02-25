import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardApiRateLimitTransformer } from "../transformers/DiscussionBoardApiRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminApiRateLimitsRateLimitId(props: {
  admin: AdminPayload;
  rateLimitId: string & tags.Format<"uuid">;
  body: IDiscussionBoardApiRateLimit.IUpdate;
}): Promise<IDiscussionBoardApiRateLimit> {
  // Verify rate limit exists and is not deleted
  const existing =
    await MyGlobal.prisma.discussion_board_api_rate_limits.findUniqueOrThrow({
      where: { id: props.rateLimitId, deleted_at: null },
    });
  // Check if any rate limit parameters are being modified
  const parametersModified =
    props.body.endpoint_path !== undefined ||
    props.body.http_method !== undefined ||
    props.body.rate_limit_type !== undefined ||
    props.body.requests_per_interval !== undefined ||
    props.body.interval_seconds !== undefined ||
    props.body.burst_limit !== undefined;
  // Generate ISO timestamp for updated_at
  const updatedAt = new Date().toISOString();
  // Build update data with proper type handling
  const updateData: Prisma.discussion_board_api_rate_limitsUpdateInput = {
    ...(props.body.endpoint_path !== undefined && {
      endpoint_path: props.body.endpoint_path,
    }),
    ...(props.body.http_method !== undefined && {
      http_method: props.body.http_method,
    }),
    ...(props.body.rate_limit_type !== undefined && {
      rate_limit_type: props.body.rate_limit_type,
    }),
    ...(props.body.requests_per_interval !== undefined && {
      requests_per_interval: props.body.requests_per_interval,
    }),
    ...(props.body.interval_seconds !== undefined && {
      interval_seconds: props.body.interval_seconds,
    }),
    ...(props.body.burst_limit !== undefined && {
      burst_limit: props.body.burst_limit,
    }),
    ...(props.body.enforcement_action !== undefined && {
      enforcement_action: props.body.enforcement_action,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    updated_at: updatedAt,
    ...(parametersModified && {
      enforcement_count: 0,
      enforced_at: null,
    }),
  };
  try {
    // Perform update with transformer for response
    const updated =
      await MyGlobal.prisma.discussion_board_api_rate_limits.update({
        where: { id: props.rateLimitId },
        data: updateData,
        ...DiscussionBoardApiRateLimitTransformer.select(),
      });
    return await DiscussionBoardApiRateLimitTransformer.transform(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation on endpoint_path, http_method, rate_limit_type
        throw new HttpException(
          "Rate limit configuration with these endpoint, method, and type already exists",
          409,
        );
      } else if (error.code === "P2025") {
        // Record not found
        throw new HttpException("Rate limit configuration not found", 404);
      }
    }
    throw error;
  }
}
