import { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformApiRateLimitTransformer {
  export type Payload = Prisma.community_platform_api_rate_limitsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        endpoint_path: true,
        http_method: true,
        max_requests: true,
        time_window_seconds: true,
        current_usage: true,
        window_start_time: true,
        window_end_time: true,
        is_active: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_api_rate_limitsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformApiRateLimit> {
    return {
      id: input.id,
      endpointPath: input.endpoint_path,
      httpMethod: input.http_method,
      maxRequests: input.max_requests,
      timeWindowSeconds: input.time_window_seconds,
      currentUsage: input.current_usage,
      windowStartTime: input.window_start_time.toISOString(),
      windowEndTime: input.window_end_time.toISOString(),
      isActive: input.is_active,
      description: input.description ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
