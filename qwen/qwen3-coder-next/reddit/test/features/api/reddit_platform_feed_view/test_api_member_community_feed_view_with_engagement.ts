import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_views_track_view } from "../../../generate/generate_random_reddit_platform_views_track_view";
import { prepare_random_reddit_platform_feed_view } from "../../../prepare/prepare_random_reddit_platform_feed_view";

export async function test_api_member_community_feed_view_with_engagement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create authenticated connection
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: member.token.access,
  };
  // 3. Generate random community ID for testing (since community creation API doesn't exist)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test trackView with community context
  const feedView = await api.functional.redditPlatform.views.trackView(
    authenticatedConnection,
    {
      body: {
        user_id: member.id,
        feed_result_id: null,
        community_id: communityId,
        session_id: typia.random<string & tags.Format<"uuid">>(),
        feed_type: "community",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ip_address: "192.168.1.1",
        engagement_duration: 45,
        items_viewed: 3,
      } satisfies IRedditPlatformFeedView.ICreate,
    },
  );
  typia.assert(feedView);
  // 5. Validate feed view record
  TestValidator.equals(
    "community_id matches",
    feedView.communityId,
    communityId,
  );
  TestValidator.equals(
    "feed_type is community",
    feedView.feedType,
    "community",
  );
  TestValidator.equals("user_id matches member", feedView.userId, member.id);
  TestValidator.predicate(
    "has valid session_id",
    feedView.sessionId !== null && feedView.sessionId !== undefined,
  );
  TestValidator.equals(
    "engagement_duration is recorded",
    feedView.engagementDuration,
    45,
  );
  TestValidator.equals("items_viewed is recorded", feedView.itemsViewed, 3);
  TestValidator.equals("user info matches", feedView.user.id, member.id);
  // 6. Test multiple feed views for the same session
  const sessionId = feedView.sessionId;
  const secondFeedView = await api.functional.redditPlatform.views.trackView(
    authenticatedConnection,
    {
      body: {
        user_id: member.id,
        feed_result_id: null,
        community_id: communityId,
        session_id: sessionId,
        feed_type: "community",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ip_address: "192.168.1.1",
        engagement_duration: 30,
        items_viewed: 2,
      } satisfies IRedditPlatformFeedView.ICreate,
    },
  );
  typia.assert(secondFeedView);
  // 7. Validate second view in same session
  TestValidator.equals(
    "session_id continuity",
    secondFeedView.sessionId,
    sessionId,
  );
  TestValidator.equals(
    "second view engagement_duration",
    secondFeedView.engagementDuration,
    30,
  );
}
