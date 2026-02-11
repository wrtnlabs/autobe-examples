import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderator_community_analytics_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  memberConnection.headers = { Authorization: member.token.access };
  // Step 2: Use an existing community ID (from scenario context)
  // Since there's no community creation endpoint available, use a test community ID
  // In real scenario, this would be obtained through initial setup
  const communityId = "550e8400-e29b-41d4-a716-446655440000";
  // Step 3: Assign member as moderator for the community
  const moderation =
    await api.functional.redditPlatform.member.redditPlatform.moderations.updateModerator(
      memberConnection,
      {
        body: {
          role: "MODERATOR" as const,
        } satisfies IRedditPlatformModeration.IUpdate,
      },
    );
  typia.assert(moderation);
  TestValidator.equals("moderator assigned", moderation.user.id, member.id);
  // Step 4: Get community analytics as moderator
  const summary = await api.functional.redditPlatform.community_views.index(
    memberConnection,
    {
      body: {
        community_id: communityId,
        min_view_duration: 0,
        min_posts_viewed: 0,
        min_scroll_depth: 0,
      } satisfies IRedditPlatformCommunityFeedView.IRequest,
    },
  );
  typia.assert(summary);
  // Step 5: Verify analytics data structure and non-negative values
  TestValidator.equals(
    "community_id matches",
    summary.community_id,
    communityId,
  );
  TestValidator.predicate("total_views non-negative", summary.total_views >= 0);
  TestValidator.predicate(
    "avg_view_duration_seconds non-negative",
    summary.avg_view_duration_seconds >= 0,
  );
  TestValidator.predicate(
    "avg_posts_viewed non-negative",
    summary.avg_posts_viewed >= 0,
  );
  TestValidator.predicate(
    "avg_scroll_depth_percent non-negative",
    summary.avg_scroll_depth_percent >= 0,
  );
  TestValidator.predicate(
    "unique_visitors non-negative",
    summary.unique_visitors >= 0,
  );
  TestValidator.predicate("guest_views non-negative", summary.guest_views >= 0);
  TestValidator.predicate(
    "authenticated_views non-negative",
    summary.authenticated_views >= 0,
  );
}
