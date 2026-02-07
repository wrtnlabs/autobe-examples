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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardApiRateLimitTransformer } from "../transformers/DiscussionBoardApiRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminApiRateLimitsRateLimitId(props: {
  superAdmin: SuperadminPayload;
  rateLimitId: string & tags.Format<"uuid">;
  body: IDiscussionBoardApiRateLimit.IUpdate;
}): Promise<IDiscussionBoardApiRateLimit> {
  // Check if the rate limit configuration exists
  const existing =
    await MyGlobal.prisma.discussion_board_api_rate_limits.findUnique({
      where: { id: props.rateLimitId },
    });
  if (!existing) {
    throw new HttpException("Rate limit configuration not found", 404);
  }
  // Build update data with proper null handling
  const updateData: Prisma.discussion_board_api_rate_limitsUpdateInput = {
    endpoint_path: props.body.endpoint_path ?? existing.endpoint_path,
    http_method: props.body.http_method ?? existing.http_method,
    rate_limit_type: props.body.rate_limit_type ?? existing.rate_limit_type,
    requests_per_interval:
      props.body.requests_per_interval ?? existing.requests_per_interval,
    interval_seconds: props.body.interval_seconds ?? existing.interval_seconds,
    burst_limit:
      props.body.burst_limit !== undefined
        ? props.body.burst_limit
        : existing.burst_limit,
    enforcement_action:
      props.body.enforcement_action ?? existing.enforcement_action,
    is_active: props.body.is_active ?? existing.is_active,
    description:
      props.body.description !== undefined
        ? props.body.description
        : existing.description,
    updated_at: toISOStringSafe(new Date()),
  };
  // Update the rate limit configuration
  const updated = await MyGlobal.prisma.discussion_board_api_rate_limits.update(
    {
      where: { id: props.rateLimitId },
      data: updateData,
      ...DiscussionBoardApiRateLimitTransformer.select(),
    },
  );
  return await DiscussionBoardApiRateLimitTransformer.transform(updated);
}
