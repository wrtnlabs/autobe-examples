import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test the search and filtering capabilities of the banned users list endpoint.
 *
 * This test validates:
 * 1. Community owner authentication and community creation
 * 2. Banning multiple users with different usernames and ban reasons
 * 3. Search functionality by partial username match
 * 4. Search by ban reason filtering
 * 5. Status filter (active bans only)
 * 6. Pagination with limit parameter
 * 7. Sorting options (created_at_desc, created_at_asc)
 * 8. Pagination metadata accuracy
 */
export async function test_api_community_ban_list_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `owner_${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 2. Create multiple users to ban with distinct usernames and reasons
  const bannedUsers: Array<{
    id: string;
    username: string;
    reason: string;
    connection: api.IConnection;
  }> = [];
  for (let i = 0; i < 5; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const username = `banned_user_${i}_${RandomGenerator.alphabets(4)}`;
    const reason = `Violation reason ${i}: ${RandomGenerator.paragraph({ sentences: 1 })}`;
    const userAuth = await authorize_member_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: username,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(userAuth);
    // Extract user ID from the authorized response
    const userId = userAuth.id;
    // Ban the user from the community
    const ban =
      await generate_random_reddit_community_member_communities_bans_create(
        ownerConnection,
        {
          params: { communityName: community.name },
          body: {
            reddit_community_member_id: userId,
            reason: reason,
          },
        },
      );
    typia.assert(ban);
    bannedUsers.push({
      id: userId,
      username: username,
      reason: reason,
      connection: userConnection,
    });
  }
  // 3. Test search by partial username match
  const firstUser = bannedUsers[0];
  const partialUsername = firstUser.username.substring(0, 10);
  const searchByUsernameResult =
    await api.functional.redditCommunity.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          search: partialUsername,
          limit: 10,
          page: 1,
          sort: "created_at_desc",
          status: "active",
        },
      },
    );
  typia.assert(searchByUsernameResult);
  TestValidator.predicate(
    "search by username returns matching users",
    () => searchByUsernameResult.data.length >= 1,
  );
  TestValidator.predicate("search results contain expected username", () =>
    searchByUsernameResult.data.some((ban) =>
      ban.bannedMember.username.includes(partialUsername),
    ),
  );
  // 4. Test search by ban reason
  const secondUser = bannedUsers[1];
  const reasonKeyword = secondUser.reason.substring(0, 15);
  const searchByReasonResult =
    await api.functional.redditCommunity.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          search: reasonKeyword,
          limit: 10,
          page: 1,
          sort: "created_at_desc",
          status: "active",
        },
      },
    );
  typia.assert(searchByReasonResult);
  TestValidator.predicate(
    "search by reason returns matching bans",
    () => searchByReasonResult.data.length >= 1,
  );
  TestValidator.predicate(
    "search results contain expected reason keyword",
    () =>
      searchByReasonResult.data.some(
        (ban) =>
          ban.reason !== null &&
          ban.reason !== undefined &&
          ban.reason.includes(reasonKeyword),
      ),
  );
  // 5. Test status filter - active bans only
  const activeBansResult =
    await api.functional.redditCommunity.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          status: "active",
          limit: 10,
          page: 1,
          sort: "created_at_desc",
        },
      },
    );
  typia.assert(activeBansResult);
  TestValidator.equals(
    "active status returns all 5 bans",
    activeBansResult.data.length,
    5,
  );
  // 6. Test pagination with limit parameter
  const paginatedResult =
    await api.functional.redditCommunity.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          limit: 2,
          page: 1,
          sort: "created_at_desc",
          status: "active",
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination total records correct",
    paginatedResult.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    paginatedResult.pagination.pages,
    3,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  // Test second page of pagination
  const page2Result =
    await api.functional.redditCommunity.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          limit: 2,
          page: 2,
          sort: "created_at_desc",
          status: "active",
        },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 limit respected", page2Result.data.length, 2);
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );
  // 7. Test sorting options
  const sortedDescResult =
    await api.functional.redditCommunity.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          limit: 10,
          page: 1,
          sort: "created_at_desc",
          status: "active",
        },
      },
    );
  typia.assert(sortedDescResult);
  const sortedAscResult =
    await api.functional.redditCommunity.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          limit: 10,
          page: 1,
          sort: "created_at_asc",
          status: "active",
        },
      },
    );
  typia.assert(sortedAscResult);
  TestValidator.equals(
    "descending sort returns 5 bans",
    sortedDescResult.data.length,
    5,
  );
  TestValidator.equals(
    "ascending sort returns 5 bans",
    sortedAscResult.data.length,
    5,
  );
  // Verify order is reversed between asc and desc
  if (sortedDescResult.data.length > 1 && sortedAscResult.data.length > 1) {
    TestValidator.notEquals(
      "sort order differs between asc and desc",
      sortedDescResult.data[0]?.bannedMember.id,
      sortedAscResult.data[0]?.bannedMember.id,
    );
    TestValidator.equals(
      "first desc equals last asc",
      sortedDescResult.data[0]?.bannedMember.id,
      sortedAscResult.data[sortedAscResult.data.length - 1]?.bannedMember.id,
    );
  }
  // 8. Verify pagination metadata accuracy
  TestValidator.predicate(
    "pagination limit matches request",
    () => paginatedResult.pagination.limit === 2,
  );
  TestValidator.predicate(
    "pagination records equals total bans",
    () => paginatedResult.pagination.records === 5,
  );
  TestValidator.predicate(
    "pagination pages calculation correct",
    () => paginatedResult.pagination.pages === Math.ceil(5 / 2),
  );
}
