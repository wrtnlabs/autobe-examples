import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunityFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_community_analytics_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and establish authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Create new connection with authenticated token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // 2. Subscribe member to target community for access authorization
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      authenticatedConnection,
      {
        communityId,
      },
    );
  typia.assert(subscription);
  // 3. Access community analytics with time range filtering and pagination
  const analytics = await api.functional.redditPlatform.community_views.index(
    authenticatedConnection,
    {
      body: {
        community_id: communityId,
        created_at_from: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at_to: new Date().toISOString(),
        page: 1,
        limit: 10,
        is_authenticated: true,
        min_view_duration: 30,
        min_posts_viewed: 1,
        min_scroll_depth: 20,
      } satisfies IRedditPlatformCommunityFeedView.IRequest,
    },
  );
  typia.assert(analytics);
  // 4. Validate analytics response structure
  TestValidator.equals(
    "community_id matches",
    analytics.community_id,
    communityId,
  );
  TestValidator.predicate("total_views positive", analytics.total_views > 0);
  TestValidator.predicate(
    "avg_view_duration positive",
    analytics.avg_view_duration_seconds >= 0,
  );
  TestValidator.predicate(
    "avg_posts_viewed positive",
    analytics.avg_posts_viewed >= 0,
  );
  TestValidator.predicate(
    "avg_scroll_depth_percent in range",
    analytics.avg_scroll_depth_percent >= 0 &&
      analytics.avg_scroll_depth_percent <= 100,
  );
  TestValidator.predicate(
    "unique_visitors positive",
    analytics.unique_visitors > 0,
  );
  TestValidator.predicate(
    "guest_views non-negative",
    analytics.guest_views >= 0,
  );
  TestValidator.predicate(
    "authenticated_views non-negative",
    analytics.authenticated_views >= 0,
  );
  TestValidator.predicate(
    "has valid created_at",
    new Date(analytics.created_at) <= new Date(),
  );
}
