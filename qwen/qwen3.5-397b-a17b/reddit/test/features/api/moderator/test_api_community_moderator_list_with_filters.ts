import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test the filtering and search capabilities when listing moderators for a community.
 *
 * This test verifies:
 * 1. Search by username (partial match, case-insensitive)
 * 2. Date range filtering (created_at_from, created_at_to)
 * 3. Sorting by created_at and username (asc/desc)
 * 4. Pagination with different page sizes
 * 5. Empty results handling
 */
export async function test_api_community_moderator_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (user A)
  const ownerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `Owner_${RandomGenerator.alphabets(5)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = {
    Authorization: `Bearer ${ownerAuth.token.access}`,
  };
  // 2. Create three moderator candidates (users B, C, D)
  const moderatorBAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `ModeratorBeta_${RandomGenerator.alphabets(5)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorBAuth);
  const moderatorCAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `ModeratorGamma_${RandomGenerator.alphabets(5)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorCAuth);
  const moderatorDAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `ModeratorDelta_${RandomGenerator.alphabets(5)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorDAuth);
  // 3. Owner creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `TestCommunity_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Owner adds all three users as moderators
  const moderatorB =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorBAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(moderatorB);
  // Small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const moderatorC =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorCAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(moderatorC);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const moderatorD =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorDAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(moderatorD);
  // 5. Test search by username (partial match)
  const searchResult =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          search: "Beta",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search returns 1 moderator for 'Beta'",
    searchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "search result username contains 'Beta'",
    searchResult.data[0].member.username.includes("Beta"),
    true,
  );
  // Test case-insensitive search
  const caseInsensitiveResult =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          search: "gamma",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);
  TestValidator.equals(
    "case-insensitive search returns 1 moderator",
    caseInsensitiveResult.pagination.records,
    1,
  );
  // 6. Test date range filtering
  const dateRangeResult =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          created_at_from: moderatorC.created_at,
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter includes C and D",
    dateRangeResult.pagination.records >= 2,
  );
  // 7. Test sorting by created_at descending
  const sortCreatedDesc =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          sort: "created_at",
          direction: "desc",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(sortCreatedDesc);
  TestValidator.equals(
    "sort desc returns all 3 moderators",
    sortCreatedDesc.pagination.records,
    3,
  );
  TestValidator.predicate(
    "first moderator is most recent",
    new Date(sortCreatedDesc.data[0].createdAt) >=
      new Date(sortCreatedDesc.data[2].createdAt),
  );
  // 8. Test sorting by created_at ascending
  const sortCreatedAsc =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          sort: "created_at",
          direction: "asc",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(sortCreatedAsc);
  TestValidator.predicate(
    "sort asc - first is oldest",
    new Date(sortCreatedAsc.data[0].createdAt) <=
      new Date(sortCreatedAsc.data[2].createdAt),
  );
  // 9. Test sorting by username ascending
  const sortUsernameAsc =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          sort: "username",
          direction: "asc",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(sortUsernameAsc);
  TestValidator.equals(
    "username sort returns all 3",
    sortUsernameAsc.pagination.records,
    3,
  );
  // 10. Test pagination with limit
  const paginatedResult =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit 2 returns 2 items",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records shows total 3",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages is 2",
    paginatedResult.pagination.pages,
    2,
  );
  // Get page 2
  const page2Result =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          page: 2,
          limit: 2,
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 returns 1 item", page2Result.data.length, 1);
  // 11. Test empty search result
  const emptyResult =
    await api.functional.redditCommunity.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          search: "NonExistentUser",
        } satisfies IRedditCommunityModerator.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptyResult.data.length,
    0,
  );
}