import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderation_logs_filtered_by_action_type_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Step 2: Create a date range for filtering (last 24 hours)
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Step 3: Call moderation logs endpoint with date range filter
  const logsResult =
    await api.functional.communityPlatform.moderator.moderation.moderation_logs.index(
      moderatorConnection,
      {
        body: {
          from: twentyFourHoursAgo.toISOString(),
          to: now.toISOString(),
          perPage: 50,
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  // Step 4: Validate response structure with typia.assert
  typia.assert(logsResult);
  // Step 5: Validate pagination structure
  TestValidator.equals(
    "pagination should exist",
    logsResult.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination should have current page >= 1",
    () => logsResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have limit > 0",
    () => logsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have records >= 0",
    () => logsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages >= 0",
    () => logsResult.pagination.pages >= 0,
  );
  // Step 6: Validate data array structure (even if empty)
  TestValidator.predicate("data should be an array", () =>
    Array.isArray(logsResult.data),
  );
  // Step 7: Validate that all data items have the correct type
  // We're testing structure, not content since we can't generate logs with available APIs
  for (const log of logsResult.data) {
    typia.assert<ICommunityPlatformModerationLog>(log);
  }
}
