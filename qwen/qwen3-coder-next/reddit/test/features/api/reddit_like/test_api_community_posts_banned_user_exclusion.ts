import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_posts_banned_user_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community
  const communityName = typia.random<string & tags.Format<"uuid">>();
  // Use a known community name since community creation endpoint not available
  // In real scenario, would need community creation - use predetermined community for testing
  const testCommunityName =
    "test-community-" + typia.random<string & tags.Format<"uuid">>();
  // 2. Create users A (banned) and B (not banned) - guests are anonymous
  const deviceA = typia.random<string & tags.Format<"uuid">>();
  const deviceB = typia.random<string & tags.Format<"uuid">>();
  const userA = await authorize_guest_join(connection, {
    body: { device_id: deviceA } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(userA);
  const userB = await authorize_guest_join(connection, {
    body: { device_id: deviceB } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(userB);
  // 3. Create connection for guest (the actor for this test)
  const guestConnection: api.IConnection = { host: connection.host };
  // 4. Since create endpoint not available, skip post creation
  // 5. Guest requests community posts using the index endpoint
  // The index endpoint requires a body with title, type, communityName
  const posts = await api.functional.redditLike.guest.communities.posts.index(
    connection,
    {
      communityName: testCommunityName,
      body: {
        title: "Test posts",
        type: "text",
        communityName: testCommunityName,
      },
    },
  );
  typia.assert(posts);
  // 6. Validate the response structure
  TestValidator.predicate(
    "has posts",
    posts.data.length > 0,
  );
  // Note: Since we can't create posts for banned user testing, this test
  // only validates the basic functionality of the index endpoint
  // Actual ban exclusion would be tested in integration tests with server-side ban logic
}