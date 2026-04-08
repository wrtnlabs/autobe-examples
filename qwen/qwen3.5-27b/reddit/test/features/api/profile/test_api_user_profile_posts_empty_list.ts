import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test viewing posts for a user who has no posts.
 *
 * Validates that the profile posts endpoint correctly handles users with zero posts. Creates a new member account without creating any posts, then retrieves their posts list to verify the response structure is valid with empty results.
 *
 * The test ensures that pagination metadata is correctly calculated for zero-record scenarios and that the endpoint returns a valid response structure even when no posts exist.
 *
 * 1. Create a new member user account with randomized credentials.
 * 2. Extract the member's profile ID from the authorization response.
 * 3. Call the profile posts endpoint with the member's profile ID.
 * 4. Validate the response returns an empty data array.
 * 5. Verify pagination metadata shows 0 records and 0 pages.
 * 6. Confirm the endpoint does not fail for users with no content.
 */
export async function test_api_user_profile_posts_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member user (no posts created)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Extract profile ID from member response
  const profileId: string = member.id;
  // 3. Call the profile posts endpoint
  const postsResponse = await api.functional.redditClone.profiles.posts.index(
    memberConnection,
    {
      profileId,
      body: {} satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(postsResponse);
  // 4. Validate empty data array
  TestValidator.equals("posts data is empty", postsResponse.data.length, 0);
  // 5. Validate pagination metadata for zero records
  TestValidator.equals(
    "pagination records is 0",
    postsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    postsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    postsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    postsResponse.pagination.limit > 0,
  );
}
