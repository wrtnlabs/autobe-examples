import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Test community moderator listing returns empty results when search query matches no moderators' usernames or emails.
 *
 * Validates that searching for moderators with a query that matches no existing usernames or email addresses returns an empty paginated list rather than throwing an error. Ensures consistent behavior with search and browse edge cases, and that pagination metadata is correctly populated even with zero results.
 *
 * 1. Authenticate a member account for community creation.
 * 2. Create a community where the creator automatically becomes the owner moderator.
 * 3. Search moderators with a query that cannot match any username or email.
 * 4. Verify the response contains zero moderator records.
 * 5. Validate pagination metadata shows records=0 and pages=0.
 */
export async function test_api_community_moderator_listing_search_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Search moderators with a query that matches nothing
  const searchQuery = "xyz_nonexistent_query_12345";
  const body = {
    search: searchQuery,
  } satisfies IREdditLikeCommunityCommunityModerator.IRequest;
  const result =
    await api.functional.redditLikeCommunity.communities.community_moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body,
      },
    );
  typia.assert(result);
  // 4. Verify zero moderator records returned
  TestValidator.equals("data is empty array", result.data.length, 0);
  // 5. Validate pagination metadata
  TestValidator.equals("pagination records is 0", result.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", result.pagination.pages, 0);
}
