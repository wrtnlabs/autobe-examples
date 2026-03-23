import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test filtering community moderators by role type (owner vs mod).
 * Validates the filtering and search capabilities of the moderator listing endpoint.
 */
export async function test_api_community_moderator_list_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "owner_user",
      display_name: "Community Owner",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: "test_community",
          description: "Test community for moderator filtering",
        },
      },
    );
  typia.assert(community);
  // 3. Register first moderator
  const mod1Connection: api.IConnection = { host: connection.host };
  const mod1Auth = await authorize_member_join(mod1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "moderator_one",
      display_name: "First Moderator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(mod1Auth);
  // 4. Register second moderator
  const mod2Connection: api.IConnection = { host: connection.host };
  const mod2Auth = await authorize_member_join(mod2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: "moderator_two",
      display_name: "Second Moderator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(mod2Auth);
  // 5. Add first moderator to community
  await generate_random_reddit_clone_member_communities_moderators_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: mod1Auth.id,
        role: "mod",
      },
    },
  );
  // 6. Add second moderator to community
  await generate_random_reddit_clone_member_communities_moderators_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: mod2Auth.id,
        role: "mod",
      },
    },
  );
  // 7. Test filtering by role='owner' - should return only owner
  const ownerFilterResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "owner",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(ownerFilterResult);
  TestValidator.equals(
    "owner filter returns 1 moderator",
    ownerFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "owner filter returns owner role",
    ownerFilterResult.data[0].role,
    "owner",
  );
  TestValidator.equals(
    "owner filter returns correct member",
    ownerFilterResult.data[0].member.id,
    ownerAuth.id,
  );
  // 8. Test filtering by role='mod' - should return only appointed moderators
  const modFilterResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "mod",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(modFilterResult);
  TestValidator.equals(
    "mod filter returns 2 moderators",
    modFilterResult.data.length,
    2,
  );
  TestValidator.equals(
    "mod filter first is mod role",
    modFilterResult.data[0].role,
    "mod",
  );
  TestValidator.equals(
    "mod filter second is mod role",
    modFilterResult.data[1].role,
    "mod",
  );
  // 9. Test without role filter - should return all moderators
  const allModeratorsResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allModeratorsResult);
  TestValidator.equals(
    "no filter returns 3 moderators",
    allModeratorsResult.data.length,
    3,
  );
  // 10. Test search by username - find first moderator
  const searchMod1Result =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          search: "moderator_one",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchMod1Result);
  TestValidator.equals(
    "search finds first moderator",
    searchMod1Result.data.length,
    1,
  );
  TestValidator.equals(
    "search returns correct username",
    searchMod1Result.data[0].member.username,
    "moderator_one",
  );
  // 11. Test search by username - find second moderator
  const searchMod2Result =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          search: "moderator_two",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchMod2Result);
  TestValidator.equals(
    "search finds second moderator",
    searchMod2Result.data.length,
    1,
  );
  TestValidator.equals(
    "search returns correct username",
    searchMod2Result.data[0].member.username,
    "moderator_two",
  );
  // 12. Test search by username - find owner
  const searchOwnerResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          search: "owner_user",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchOwnerResult);
  TestValidator.equals("search finds owner", searchOwnerResult.data.length, 1);
  TestValidator.equals(
    "search returns owner",
    searchOwnerResult.data[0].member.id,
    ownerAuth.id,
  );
  // 13. Test pagination with filtered results
  const paginationResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "mod",
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns 1 item per page",
    paginationResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination shows 2 total records",
    paginationResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination shows 2 total pages",
    paginationResult.pagination.pages,
    2,
  );
  // 14. Test sorting by username
  const sortedByUsernameResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          sort: "username",
          order: "asc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sortedByUsernameResult);
  TestValidator.predicate(
    "sorted by username ascending",
    sortedByUsernameResult.data.every((mod, index, array) => {
      if (index === 0) return true;
      return array[index - 1].member.username <= mod.member.username;
    }),
  );
  // 15. Test sorting by role
  const sortedByRoleResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          sort: "role",
          order: "asc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sortedByRoleResult);
  TestValidator.predicate(
    "sorted by role ascending",
    sortedByRoleResult.data.every((mod, index, array) => {
      if (index === 0) return true;
      return array[index - 1].role <= mod.role;
    }),
  );
  // 16. Test combined filter: role='mod' with search
  const combinedFilterResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "mod",
          search: "moderator_one",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns 1 result",
    combinedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter returns correct role",
    combinedFilterResult.data[0].role,
    "mod",
  );
  TestValidator.equals(
    "combined filter returns correct username",
    combinedFilterResult.data[0].member.username,
    "moderator_one",
  );
}
