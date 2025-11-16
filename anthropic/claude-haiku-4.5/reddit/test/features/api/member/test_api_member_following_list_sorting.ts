import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";

export async function test_api_member_following_list_sorting(
  connection: api.IConnection,
) {
  // Setup: Create primary member account
  const primaryMemberEmail = typia.random<string & tags.Format<"email">>();
  const primaryMemberPassword = RandomGenerator.alphaNumeric(12);
  const primaryMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: primaryMemberEmail,
        username: RandomGenerator.alphabets(10),
        password: primaryMemberPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(primaryMember);

  // Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(10),
        password: adminPassword,
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin for category creation
  const adminLogin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  typia.assert(adminLogin);

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to primary member for community and following operations
  const primaryLogin: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: primaryMemberEmail,
        password: primaryMemberPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(primaryLogin);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create multiple secondary members with distinct characteristics
  const secondaryMembers: ICommunityPlatformMember.IAuthorized[] = [];
  const memberUsernames = [
    "alice_user",
    "bob_smith",
    "charlie_brown",
    "diana_prince",
    "eve_johnson",
  ] as const;

  for (let i = 0; i < memberUsernames.length; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(12);
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email,
          username: memberUsernames[i],
          password,
          href: "http://localhost:3000",
          referrer: "http://localhost:3000",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
    secondaryMembers.push(member);

    // Create a post for each member to establish presence
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  }

  // Switch back to primary member for following operations
  const primaryLoginAgain: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: primaryMemberEmail,
        password: primaryMemberPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(primaryLoginAgain);

  // Create follow relationships
  for (let i = 0; i < secondaryMembers.length; i++) {
    const followRelationship: ICommunityPlatformMemberFollower =
      await api.functional.communityPlatform.member.members.following.create(
        connection,
        {
          memberId: primaryMember.id,
          followingId: secondaryMembers[i].id,
        },
      );
    typia.assert(followRelationship);
  }

  // Test 1: Default sorting (should be by follow date, newest first)
  const defaultSorted: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(connection, {
      memberId: primaryMember.id,
      body: {
        page: 1,
        limit: 20,
        sortBy: null,
      } satisfies ICommunityPlatformMemberFollower.IRequest,
    });
  typia.assert(defaultSorted);
  TestValidator.predicate(
    "default sorting returns paginated results",
    defaultSorted.data.length > 0,
  );
  TestValidator.equals(
    "default sort has pagination info",
    defaultSorted.pagination.current,
    1,
  );

  // Test 2: Sort by 'name' (alphabetical)
  const nameSorted: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(connection, {
      memberId: primaryMember.id,
      body: {
        page: 1,
        limit: 20,
        sortBy: "name",
      } satisfies ICommunityPlatformMemberFollower.IRequest,
    });
  typia.assert(nameSorted);
  TestValidator.equals(
    "name sorting returns correct count",
    nameSorted.data.length,
    secondaryMembers.length,
  );

  // Verify alphabetical order
  for (let i = 0; i < nameSorted.data.length - 1; i++) {
    const current = nameSorted.data[i].username.toLowerCase();
    const next = nameSorted.data[i + 1].username.toLowerCase();
    TestValidator.predicate(
      `username at position ${i} should be alphabetically before position ${i + 1}`,
      current <= next,
    );
  }

  // Test 3: Sort by 'recent' (follow date, newest first)
  const recentSorted: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(connection, {
      memberId: primaryMember.id,
      body: {
        page: 1,
        limit: 20,
        sortBy: "recent",
      } satisfies ICommunityPlatformMemberFollower.IRequest,
    });
  typia.assert(recentSorted);
  TestValidator.equals(
    "recent sorting returns correct count",
    recentSorted.data.length,
    secondaryMembers.length,
  );

  // Test 4: Sort by 'karma' (highest reputation first)
  const karmaSorted: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(connection, {
      memberId: primaryMember.id,
      body: {
        page: 1,
        limit: 20,
        sortBy: "karma",
      } satisfies ICommunityPlatformMemberFollower.IRequest,
    });
  typia.assert(karmaSorted);
  TestValidator.equals(
    "karma sorting returns correct count",
    karmaSorted.data.length,
    secondaryMembers.length,
  );

  // Verify karma is in descending order
  for (let i = 0; i < karmaSorted.data.length - 1; i++) {
    const current = karmaSorted.data[i].karma_score;
    const next = karmaSorted.data[i + 1].karma_score;
    TestValidator.predicate(
      `karma at position ${i} (${current}) should be >= position ${i + 1} (${next})`,
      current >= next,
    );
  }

  // Test 5: Sort by 'created' (account age, oldest first)
  const createdSorted: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(connection, {
      memberId: primaryMember.id,
      body: {
        page: 1,
        limit: 20,
        sortBy: "created",
      } satisfies ICommunityPlatformMemberFollower.IRequest,
    });
  typia.assert(createdSorted);
  TestValidator.equals(
    "created sorting returns correct count",
    createdSorted.data.length,
    secondaryMembers.length,
  );

  // Verify accounts are in oldest first order
  for (let i = 0; i < createdSorted.data.length - 1; i++) {
    const current = new Date(createdSorted.data[i].created_at).getTime();
    const next = new Date(createdSorted.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `account creation date at position ${i} should be <= position ${i + 1}`,
      current <= next,
    );
  }

  // Test 6: Pagination with sorting
  const paginatedSorted: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(connection, {
      memberId: primaryMember.id,
      body: {
        page: 1,
        limit: 2,
        sortBy: "name",
      } satisfies ICommunityPlatformMemberFollower.IRequest,
    });
  typia.assert(paginatedSorted);
  TestValidator.predicate(
    "paginated sorting respects limit",
    paginatedSorted.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page is correct",
    paginatedSorted.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    paginatedSorted.pagination.limit,
    2,
  );

  // Test 7: Search filtering with sorting
  const searchTerm = "alice";
  const searchWithSort: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(connection, {
      memberId: primaryMember.id,
      body: {
        page: 1,
        limit: 20,
        search: searchTerm,
        sortBy: "name",
      } satisfies ICommunityPlatformMemberFollower.IRequest,
    });
  typia.assert(searchWithSort);

  // Verify search results contain matching members
  for (const member of searchWithSort.data) {
    TestValidator.predicate(
      `search result should contain search term "${searchTerm}"`,
      member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  // Test 8: Verify pagination totals are correct
  TestValidator.predicate(
    "pagination records should be positive",
    paginatedSorted.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    paginatedSorted.pagination.pages >=
      Math.ceil(
        paginatedSorted.pagination.records / paginatedSorted.pagination.limit,
      ),
  );
}
