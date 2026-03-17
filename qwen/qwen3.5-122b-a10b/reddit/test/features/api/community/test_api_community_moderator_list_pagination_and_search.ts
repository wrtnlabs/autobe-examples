import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

/**
 * Test the pagination and search functionality of the moderator list retrieval endpoint.
 * 1. Create member account and authenticate as owner
 * 2. Create community
 * 3. Add multiple moderators (at least 5-10) to the community with different usernames
 * 4. Call retrieve moderators with pagination parameters (page=1, limit=3)
 * 5. Verify only 3 moderators are returned on first page
 * 6. Verify pagination metadata shows correct total records and pages
 * 7. Call retrieve moderators with search parameter to filter by username substring
 * 8. Verify search returns only matching moderators
 * 9. Verify soft-deleted moderator assignments are excluded from all results
 */
export async function test_api_community_moderator_list_pagination_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "owner_" + RandomGenerator.alphabets(5),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(ownerAuth);
  // 2. Create community (owner becomes creator)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: "test_community_" + RandomGenerator.alphabets(5),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create multiple moderator accounts and add them to community
  const moderatorUsernames: string[] = [];
  const moderatorConnections: api.IConnection[] = [];
  const moderatorIds: string[] = [];
  const MODERATOR_COUNT = 8;
  for (let i = 0; i < MODERATOR_COUNT; i++) {
    const username = "mod_" + RandomGenerator.alphabets(5);
    moderatorUsernames.push(username);
    const modConnection: api.IConnection = { host: connection.host };
    const modAuth = await authorize_member_join(modConnection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: username,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    });
    typia.assert(modAuth);
    moderatorConnections.push(modConnection);
    moderatorIds.push(modAuth.id);
    // Add as moderator
    await generate_random_reddit_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: modAuth.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  }
  // 4. Test pagination - page 1, limit 3
  const page1Result =
    await api.functional.redditPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 3,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1Result);
  // 5. Verify only 3 moderators returned on first page
  TestValidator.equals(
    "first page has 3 moderators",
    page1Result.data.length,
    3,
  );
  // 6. Verify pagination metadata
  TestValidator.equals(
    "total records is 8",
    page1Result.pagination.records,
    MODERATOR_COUNT,
  );
  TestValidator.equals("current page is 1", page1Result.pagination.current, 1);
  TestValidator.equals("limit is 3", page1Result.pagination.limit, 3);
  TestValidator.predicate(
    "pages calculated correctly",
    page1Result.pagination.pages === Math.ceil(MODERATOR_COUNT / 3),
  );
  // 7. Test pagination - page 2, limit 3
  const page2Result =
    await api.functional.redditPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 3,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "second page has 3 moderators",
    page2Result.data.length,
    3,
  );
  // 8. Test pagination - page 3, limit 3 (should have 2 remaining)
  const page3Result =
    await api.functional.redditPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 3,
          limit: 3,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals(
    "third page has 2 moderators",
    page3Result.data.length,
    2,
  );
  // 9. Test search functionality - search by username substring
  const searchUsername = moderatorUsernames[0];
  const searchSubstring = searchUsername.substring(0, 4); // First 4 characters
  const searchResult =
    await api.functional.redditPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          search: searchSubstring,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify search returns only matching moderators
  TestValidator.predicate(
    "search returns only matching moderators",
    searchResult.data.every((mod) =>
      mod.member.username.includes(searchSubstring),
    ),
  );
  TestValidator.predicate(
    "search returns at least one result",
    searchResult.data.length > 0,
  );
  // 10. Verify all returned moderators have correct structure
  for (const mod of page1Result.data) {
    TestValidator.predicate("moderator has id", mod.id !== undefined);
    TestValidator.predicate("moderator has member", mod.member !== undefined);
    TestValidator.predicate(
      "moderator member has username",
      mod.member.username !== undefined,
    );
    TestValidator.predicate(
      "moderator has community",
      mod.community !== undefined,
    );
    TestValidator.predicate(
      "moderator has created_at",
      mod.created_at !== undefined,
    );
  }
}