import { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformApiRateLimitTransformer } from "../transformers/CommunityPlatformApiRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformAdminApiRateLimitsApiRateLimitId(props: {
  admin: AdminPayload;
  apiRateLimitId: string & tags.Format<"uuid">;
  body: ICommunityPlatformApiRateLimit.IUpdate;
}): Promise<ICommunityPlatformApiRateLimit> {
  // Verify the rate limit configuration exists
  await MyGlobal.prisma.community_platform_api_rate_limits.findUniqueOrThrow({
    where: { id: props.apiRateLimitId },
  });
  // Prepare update data with conditional field updates
  const updateData: Prisma.community_platform_api_rate_limitsUpdateInput = {
    updated_at: new Date(),
  };
  // Conditionally update each field if provided
  if (props.body.endpoint_path !== undefined) {
    updateData.endpoint_path = props.body.endpoint_path;
  }
  if (props.body.http_method !== undefined) {
    updateData.http_method = props.body.http_method;
  }
  if (props.body.max_requests !== undefined) {
    updateData.max_requests = props.body.max_requests;
  }
  if (props.body.time_window_seconds !== undefined) {
    updateData.time_window_seconds = props.body.time_window_seconds;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // Perform the update
  const updated =
    await MyGlobal.prisma.community_platform_api_rate_limits.update({
      where: { id: props.apiRateLimitId },
      data: updateData,
      ...CommunityPlatformApiRateLimitTransformer.select(),
    });
  // Transform and return the result
  return await CommunityPlatformApiRateLimitTransformer.transform(updated);
}
