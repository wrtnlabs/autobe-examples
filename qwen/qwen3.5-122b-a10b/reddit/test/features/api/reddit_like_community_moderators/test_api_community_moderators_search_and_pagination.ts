import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityModerator";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
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
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test community moderators search and pagination functionality.
 *
 * Validates the moderators list endpoint's search and pagination capabilities by creating a community with multiple moderators having distinct usernames. The test verifies that search parameters correctly filter moderators by username using case-insensitive matching, and that pagination parameters (offset, limit, page) return the correct subset of moderators with accurate metadata.
 *
 * 1. Create a member account for authentication.
 * 2. Create a community with the authenticated member as owner.
 * 3. Add multiple moderators with different usernames for search testing.
 * 4. Test search functionality with various search terms.
 * 5. Test pagination with different offset, limit, and page values.
 * 6. Validate pagination metadata (current page, total records, total pages, limit).
 */
export async function test_api_community_moderators_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create multiple moderators with distinct usernames
  const moderatorUsernames: string[] = [];
  const moderatorIds: string[] = [];
  await ArrayUtil.asyncRepeat(5, async (index) => {
    const username = `moderator_${RandomGenerator.alphabets(5)}`;
    moderatorUsernames.push(username);
    // Create a new member to be a moderator
    const modConnection: api.IConnection = { host: connection.host };
    const modMember = await authorize_member_join(modConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: username,
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
    typia.assert(modMember);
    // Add as moderator
    const moderator =
      await generate_random_reddit_like_member_communities_moderators_create(
        memberConnection,
        {
          body: {
            member_id: modMember.id,
          } satisfies IRedditLikeCommunityModerator.ICreate,
          params: {
            communityId: community.id,
          },
        },
      );
    typia.assert(moderator);
    moderatorIds.push(modMember.id);
  });
  // 4. Test search functionality
  // Test exact username match (case-insensitive)
  const searchTerm = moderatorUsernames[0].substring(0, 5);
  const searchResult =
    await api.functional.redditLike.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          search: searchTerm,
          limit: 10,
        } satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify search results contain matching moderators
  TestValidator.predicate(
    "search results should contain matching moderators",
    searchResult.data.every((mod) =>
      mod.member.username.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  // Test search with no matches
  const noMatchResult =
    await api.functional.redditLike.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          search: "nonexistent_username_xyz",
          limit: 10,
        } satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match search returns empty data",
    noMatchResult.data.length,
    0,
  );
  // 5. Test pagination
  // Test with limit
  const limitedResult =
    await api.functional.redditLike.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          limit: 2,
        } satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals("limited results count", limitedResult.data.length, 2);
  TestValidator.equals(
    "pagination limit matches request",
    limitedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records should be at least limited count",
    limitedResult.pagination.records >= 2,
  );
  // Test with offset
  const offsetResult =
    await api.functional.redditLike.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          offset: 2,
          limit: 2,
        } satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(offsetResult);
  TestValidator.equals("offset results count", offsetResult.data.length, 2);
  TestValidator.notEquals(
    "offset results differ from first page",
    offsetResult.data[0].id,
    limitedResult.data[0].id,
  );
  // Test with page parameter
  const pageResult =
    await api.functional.redditLike.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "page number in pagination",
    pageResult.pagination.current,
    2,
  );
  TestValidator.equals("page 2 results count", pageResult.data.length, 2);
  // 6. Validate pagination metadata
  const allResult =
    await api.functional.redditLike.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          limit: 10,
        } satisfies IRedditLikeCommunityModerator.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "pagination records equals total moderators",
    allResult.pagination.records >= 5,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    allResult.pagination.pages ===
      Math.ceil(allResult.pagination.records / allResult.pagination.limit),
  );
  TestValidator.equals(
    "pagination current page is 1",
    allResult.pagination.current,
    1,
  );
}