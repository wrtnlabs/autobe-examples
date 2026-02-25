import { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformApiRateLimitAtSummaryTransformer {
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
        is_active: true,
        window_start_time: true,
        window_end_time: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_platform_api_rate_limitsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformApiRateLimit.ISummary> {
    return {
      id: input.id,
      endpoint_path: input.endpoint_path,
      http_method: input.http_method,
      max_requests: input.max_requests,
      time_window_seconds: input.time_window_seconds,
      current_usage: input.current_usage,
      is_active: input.is_active,
    };
  }
}
