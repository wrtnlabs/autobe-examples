import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
import { generate_random_reddit_platform_views_track_view } from "../../../generate/generate_random_reddit_platform_views_track_view";
import { prepare_random_reddit_platform_feed_view } from "../../../prepare/prepare_random_reddit_platform_feed_view";

export async function test_api_guest_community_feed_view_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session with device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const fingerprint = typia.random<string & tags.Format<"uuid">>();
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: fingerprint,
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Create a mock community ID for testing
  // Since there's no communities endpoint available, we'll use a random UUID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. View community feed as guest
  // Use the guest's ID as session_id to track the guest session
  const session_id = guest.id satisfies string & tags.Format<"uuid"> as string &
    tags.Format<"uuid">;
  const view = await api.functional.redditPlatform.views.trackView(
    guestConnection,
    {
      body: {
        user_id: guest.id,
        feed_result_id: null,
        community_id: communityId,
        session_id,
        feed_type: "community",
        user_agent: "TestGuestBrowser/1.0",
        ip_address: "127.0.0.1",
        engagement_duration: 45,
        items_viewed: 12,
      } satisfies IRedditPlatformFeedView.ICreate,
    },
  );
  typia.assert(view);
  // 4. Validate feed view record
  TestValidator.equals("guest session recorded", view.sessionId, session_id);
  TestValidator.equals("feed type is community", view.feedType, "community");
  TestValidator.equals(
    "community context correct",
    view.communityId,
    communityId,
  );
  TestValidator.equals("user is guest", view.userId, guest.id);
  TestValidator.predicate(
    "engagement captured",
    view.engagementDuration !== null,
  );
  TestValidator.predicate("items viewed captured", view.itemsViewed !== null);
}
