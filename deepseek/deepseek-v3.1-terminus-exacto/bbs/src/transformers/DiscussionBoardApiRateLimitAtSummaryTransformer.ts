import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardApiRateLimitAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_api_rate_limitsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        endpoint_path: true,
        http_method: true,
        rate_limit_type: true,
        requests_per_interval: true,
        interval_seconds: true,
        burst_limit: true,
        enforcement_action: true,
        enforced_at: true,
        enforcement_count: true,
        is_active: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: true,
        admin: true,
        superAdmin: true,
      },
    } satisfies Prisma.discussion_board_api_rate_limitsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardApiRateLimit.ISummary> {
    return {
      id: input.id,
      endpoint_path: input.endpoint_path,
      http_method: input.http_method,
      rate_limit_type: input.rate_limit_type,
      requests_per_interval: input.requests_per_interval,
      interval_seconds: input.interval_seconds,
      burst_limit: input.burst_limit ?? null,
      enforcement_action: input.enforcement_action,
      is_active: input.is_active,
      enforcement_count: input.enforcement_count,
      enforced_at: input.enforced_at?.toISOString() ?? null,
    };
  }
}
