import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardSuperAdminTransformer } from "./DiscussionBoardSuperAdminTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardApiRateLimitTransformer {
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
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        superAdmin: DiscussionBoardSuperAdminTransformer.select(),
      },
    } satisfies Prisma.discussion_board_api_rate_limitsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardApiRateLimit> {
    return {
      id: input.id,
      endpoint_path: input.endpoint_path,
      http_method: input.http_method,
      rate_limit_type: input.rate_limit_type,
      requests_per_interval: input.requests_per_interval,
      interval_seconds: input.interval_seconds,
      burst_limit: input.burst_limit ?? null,
      enforcement_action: input.enforcement_action,
      enforcement_count: input.enforcement_count,
      enforced_at: input.enforced_at
        ? toISOStringSafe(input.enforced_at)
        : null,
      is_active: input.is_active,
      description: input.description ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      user: input.user
        ? await DiscussionBoardUserAtSummaryTransformer.transform(input.user)
        : null,
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : null,
      superAdmin: input.superAdmin
        ? await DiscussionBoardSuperAdminTransformer.transform(input.superAdmin)
        : null,
    };
  }
}
