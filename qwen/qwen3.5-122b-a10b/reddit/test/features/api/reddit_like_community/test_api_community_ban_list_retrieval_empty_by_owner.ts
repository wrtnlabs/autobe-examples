import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityBan";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test community owner retrieves empty ban list when no users are banned.
 *
 * Validates that a community owner can successfully access the ban list endpoint for their community when no bans exist. The test verifies the endpoint returns an empty data array with valid pagination metadata, confirming proper access permissions and correct handling of empty result sets.
 *
 * The test follows this workflow:
 *
 * 1. Register a new member account with random credentials
 * 2. Create a new community (member becomes owner automatically)
 * 3. Retrieve the ban list for the community
 * 4. Validate the response contains empty data array and valid pagination
 *
 * This ensures the ban management interface is accessible to owners and correctly handles the case when no users have been banned.
 */
export async function test_api_community_ban_list_retrieval_empty_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community (owner becomes community owner)
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: `test-community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Retrieve ban list (should be empty)
  const banList = await api.functional.redditLike.member.communities.bans.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        limit: 20,
        page: 1,
      } satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(banList);
  // 4. Validate empty ban list with valid pagination
  TestValidator.equals("ban list is empty", banList.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    banList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", banList.pagination.limit, 20);
  TestValidator.equals("pagination records", banList.pagination.records, 0);
  TestValidator.equals("pagination pages", banList.pagination.pages, 0);
}
