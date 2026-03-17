import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the behavior when viewing posts for a user who has no posts.
 * Register a guest user first. Retrieve posts for a user who has never
 * created any posts or whose posts have all been deleted. Validate that
 * the response returns an empty data array with pagination metadata
 * showing records=0 and pages=0. Ensure the endpoint does not return
 * an error but gracefully handles the empty state. Verify the response
 * structure is correct even with no posts.
 */
export async function test_api_user_posts_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {},
  });
  typia.assert(guestAuth);
  // 2. Retrieve posts for the guest user (who has zero posts)
  const postsResponse =
    await api.functional.redditCommunity.guest.users.posts.index(
      guestConnection,
      {
        userId: guestAuth.id,
        body: {} satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(postsResponse);
  // 3. Validate empty state
  TestValidator.equals("posts data array is empty", postsResponse.data, []);
  TestValidator.equals(
    "pagination records is zero",
    postsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    postsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current starts at 1",
    postsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 by default",
    postsResponse.pagination.limit,
    20,
  );
}
