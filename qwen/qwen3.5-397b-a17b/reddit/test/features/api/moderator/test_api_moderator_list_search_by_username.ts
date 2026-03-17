import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator } from "../../../prepare/prepare_random_reddit_clone_moderator";

export async function test_api_moderator_list_search_by_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: "owner_user",
      display_name: "Owner Display",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: "test_community_search",
        description: "Test community for moderator search",
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create additional members to add as moderators
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1Auth = await authorize_member_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: "alice_mod",
      display_name: "Alice Moderator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator1Auth);
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2Auth = await authorize_member_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: "bob_admin",
      display_name: "Bob Administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator2Auth);
  const moderator3Connection: api.IConnection = { host: connection.host };
  const moderator3Auth = await authorize_member_join(moderator3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: "charlie_helper",
      display_name: "Charlie Helper",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderator3Auth);
  // 4. Add moderators to the community (owner adds them)
  const mod1Assignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        body: { member_id: moderator1Auth.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(mod1Assignment);
  const mod2Assignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        body: { member_id: moderator2Auth.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(mod2Assignment);
  const mod3Assignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        body: { member_id: moderator3Auth.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(mod3Assignment);
  // 5. Test exact username match - "alice_mod"
  const exactSearchResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { search: "alice_mod" },
      },
    );
  typia.assert(exactSearchResult);
  TestValidator.equals(
    "exact username search returns 1 result",
    exactSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "exact search returns alice_mod",
    exactSearchResult.data[0].member.username,
    "alice_mod",
  );
  // 6. Test partial username substring - "mod" should match alice_mod and charlie_helper (has "mod" in username? no, but in display_name "Moderator")
  // Actually "mod" in username matches "alice_mod" only. Let's test "_mod" which matches "alice_mod"
  const partialSearchResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { search: "_mod" },
      },
    );
  typia.assert(partialSearchResult);
  TestValidator.predicate(
    "partial username search returns at least 1 result",
    partialSearchResult.data.length >= 1,
  );
  const hasAliceMod = partialSearchResult.data.some(
    (m) => m.member.username === "alice_mod",
  );
  TestValidator.predicate("partial search includes alice_mod", hasAliceMod);
  // 7. Test display name search - "Alice" should match alice_mod
  const displayNameSearchResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { search: "Alice" },
      },
    );
  typia.assert(displayNameSearchResult);
  TestValidator.equals(
    "display name search returns 1 result",
    displayNameSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "display name search returns alice",
    displayNameSearchResult.data[0].member.display_name,
    "Alice Moderator",
  );
  // 8. Test non-existent search term - should return empty array with valid pagination
  const emptySearchResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { search: "nonexistent_user_xyz_123" },
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "non-existent search returns empty array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    emptySearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    emptySearchResult.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination records is 0",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    emptySearchResult.pagination.pages,
    0,
  );
  // 9. Test search combined with is_owner filter - search "owner" with is_owner=true should return owner
  const ownerSearchResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { search: "owner", is_owner: true },
      },
    );
  typia.assert(ownerSearchResult);
  TestValidator.equals(
    "owner search with is_owner=true returns 1",
    ownerSearchResult.data.length,
    1,
  );
  TestValidator.predicate(
    "owner result has is_owner=true",
    ownerSearchResult.data[0].is_owner === true,
  );
  // 10. Test search combined with is_owner=false - should return non-owner moderators matching search
  const nonOwnerSearchResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { search: "mod", is_owner: false },
      },
    );
  typia.assert(nonOwnerSearchResult);
  TestValidator.predicate(
    "non-owner search returns results",
    nonOwnerSearchResult.data.length >= 1,
  );
  const allNonOwners = nonOwnerSearchResult.data.every(
    (m) => m.is_owner === false,
  );
  TestValidator.predicate(
    "all non-owner results have is_owner=false",
    allNonOwners,
  );
  // 11. Validate pagination metadata structure on full list
  const fullListResult =
    await api.functional.redditClone.member.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { limit: 10, page: 1 },
      },
    );
  typia.assert(fullListResult);
  TestValidator.equals(
    "full list has 4 moderators (owner + 3 added)",
    fullListResult.data.length,
    4,
  );
  TestValidator.equals(
    "pagination current page is 1",
    fullListResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    fullListResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records is 4",
    fullListResult.pagination.records,
    4,
  );
  TestValidator.equals(
    "pagination pages is 1",
    fullListResult.pagination.pages,
    1,
  );
}
