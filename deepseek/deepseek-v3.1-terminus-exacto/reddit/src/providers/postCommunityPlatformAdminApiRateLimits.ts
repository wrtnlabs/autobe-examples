import { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformApiRateLimitCollector } from "../collectors/CommunityPlatformApiRateLimitCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformApiRateLimitTransformer } from "../transformers/CommunityPlatformApiRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminApiRateLimits(props: {
  admin: AdminPayload;
  body: ICommunityPlatformApiRateLimit.ICreate;
}): Promise<ICommunityPlatformApiRateLimit> {
  // Check if rate limit configuration already exists for this endpoint/method combination
  const existing =
    await MyGlobal.prisma.community_platform_api_rate_limits.findUnique({
      where: {
        endpoint_path_http_method: {
          endpoint_path: props.body.endpoint_path,
          http_method: props.body.http_method,
        },
      },
    });
  if (existing) {
    throw new HttpException(
      `Rate limit configuration already exists for endpoint '${props.body.endpoint_path}' and method '${props.body.http_method}'`,
      409,
    );
  }
  // Create the new rate limit configuration
  const created =
    await MyGlobal.prisma.community_platform_api_rate_limits.create({
      data: await CommunityPlatformApiRateLimitCollector.collect({
        body: props.body,
      }),
      ...CommunityPlatformApiRateLimitTransformer.select(),
    });
  return await CommunityPlatformApiRateLimitTransformer.transform(created);
}
