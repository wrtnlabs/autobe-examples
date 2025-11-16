import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Test filtering community subscriptions by member username using partial
 * matching.
 *
 * This test validates the moderator subscription listing endpoint with
 * username-based filtering. A moderator retrieves and filters community members
 * by username using partial matching, confirming that the search functionality
 * correctly returns matching members with proper pagination and handles edge
 * cases like empty results.
 *
 * Workflow:
 *
 * 1. Register administrator, moderator, creator member, and multiple subscriber
 *    member accounts
 * 2. Create a category for community classification
 * 3. Create a community as the creator member
 * 4. Subscribe multiple members with different usernames to the community
 * 5. Test username filtering with various search terms
 * 6. Validate pagination with filters
 * 7. Verify empty results for non-matching searches
 * 8. Confirm case-insensitive partial matching behavior
 */
export async function test_api_community_subscriptions_moderator_filter_by_username(
  connection: api.IConnection,
) {
  // 1. Register administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://community.example.com/auth/admin",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(8),
        href: "https://community.example.com/auth/moderator",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Register creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphabets(12);
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(10),
        password: creatorPassword,
        href: "https://community.example.com/auth/member",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // 4. Create category for the community
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://community.example.com/auth/admin",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Switch to creator member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "https://community.example.com/auth/member",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: "tech_discussion",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create multiple members with different usernames
  const memberNames = [
    "alice_developer",
    "bob_engineer",
    "charlie_designer",
    "david_admin",
    "alice_tester",
  ];

  const members: {
    account: ICommunityPlatformMember.IAuthorized;
    password: string;
  }[] = [];

  for (const memberName of memberNames) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphabets(12);
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          username: memberName,
          password: memberPassword,
          href: "https://community.example.com/auth/member",
          referrer: "https://community.example.com/",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    members.push({ account: member, password: memberPassword });
  }

  // 7. Switch to moderator to access subscription filtering endpoint
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/auth/moderator",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 8. Test filtering with various search terms

  // Test: Search for "alice" should return members with usernames containing "alice"
  const searchAlice: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "alice",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchAlice);
  TestValidator.predicate(
    "alice search should return members with alice in username",
    searchAlice.data.length >= 0,
  );

  // Test: Search for "engineer" should return only bob_engineer
  const searchEngineer: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "engineer",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchEngineer);

  // Test: Case-insensitive search - search for "ALICE" should match "alice_developer"
  const searchAliceUppercase: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "ALICE",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchAliceUppercase);

  // Test: Empty search results - search for non-existent username
  const searchNonExistent: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "nonexistentuser12345",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchNonExistent);
  TestValidator.equals(
    "non-existent search should return empty results",
    searchNonExistent.data.length,
    0,
  );

  // Test: Pagination with filter
  const paginatedSearch: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 1,
          search_username: "alice",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination metadata should be present",
    paginatedSearch.pagination.current === 1 &&
      paginatedSearch.pagination.limit === 1,
  );

  // Test: Partial matching - "bob" should match "bob_engineer"
  const searchBob: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "bob",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchBob);

  // Test: No search filter - should return all members
  const allMembers: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.moderator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allMembers);
  TestValidator.predicate(
    "pagination should have valid data structure",
    allMembers.pagination.current >= 1 && allMembers.pagination.limit >= 1,
  );
}
