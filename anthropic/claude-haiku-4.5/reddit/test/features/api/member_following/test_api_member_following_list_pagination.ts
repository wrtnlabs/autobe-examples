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

/**
 * Test pagination behavior when retrieving a member's following list.
 *
 * This test validates the PATCH /communityPlatform/members/{memberId}/following
 * endpoint's pagination functionality by creating multiple follow relationships
 * and testing various pagination scenarios including different page numbers,
 * limit values, and boundary conditions.
 *
 * Test workflow:
 *
 * 1. Create administrator account for platform setup
 * 2. Create a category for community creation
 * 3. Create a primary member account who will follow others
 * 4. Create multiple (5+) secondary member accounts to follow
 * 5. Create a community for context
 * 6. Create posts to establish member presence
 * 7. Establish follow relationships from primary member to secondary members
 * 8. Test pagination with page=1, limit=2 (expecting first 2 members)
 * 9. Test pagination with page=2, limit=2 (expecting next 2 members)
 * 10. Test pagination with page=3, limit=2 (expecting remaining members)
 * 11. Test pagination with page=10 (beyond available pages, expecting empty)
 * 12. Test edge case with limit=1
 * 13. Test edge case with limit=100 (maximum)
 * 14. Verify pagination metadata is accurate for all requests
 */
export async function test_api_member_following_list_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin.${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin123!@#",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: "Test Admin",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin connection
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: admin.token.access,
    },
  };

  // Step 2: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Test Category",
          slug: `test-category-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Test category for following list pagination",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create primary member account
  const primaryEmail = `primary.${RandomGenerator.alphaNumeric(8)}@test.com`;
  const primaryMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: primaryEmail,
        username: `primary_${RandomGenerator.alphaNumeric(6)}`,
        password: "Password123!@#",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(primaryMember);

  // Create member connection for primary user
  const primaryConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: primaryMember.token.access,
    },
  };

  // Step 4: Create multiple secondary member accounts (at least 5)
  const secondaryMembers: ICommunityPlatformMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(6, async (index) => {
      const email = `member${index}.${RandomGenerator.alphaNumeric(8)}@test.com`;
      const member: ICommunityPlatformMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: {
            email: email,
            username: `member${index}_${RandomGenerator.alphaNumeric(6)}`,
            password: "Password123!@#",
            href: "http://localhost:3000",
            referrer: "http://localhost:3000",
          } satisfies ICommunityPlatformMember.ICreate,
        });
      typia.assert(member);
      return member;
    });

  // Step 5: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      primaryConnection,
      {
        body: {
          name: "Test Community",
          identifier: `test_community_${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
          description: "Test community for pagination testing",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create posts to establish member presence
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      primaryConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: "Test Post",
          content_text: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // Step 7: Establish follow relationships from primary member to secondary members
  const followRelationships: ICommunityPlatformMemberFollower[] =
    await ArrayUtil.asyncRepeat(secondaryMembers.length, async (index) => {
      const follower: ICommunityPlatformMemberFollower =
        await api.functional.communityPlatform.member.members.following.create(
          primaryConnection,
          {
            memberId: primaryMember.id,
            followingId: secondaryMembers[index].id,
          },
        );
      typia.assert(follower);
      return follower;
    });

  TestValidator.equals(
    "6 follow relationships created",
    followRelationships.length,
    6,
  );

  // Step 8: Test pagination with page=1, limit=2
  const page1Limit2: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(
      primaryConnection,
      {
        memberId: primaryMember.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformMemberFollower.IRequest,
      },
    );
  typia.assert(page1Limit2);
  TestValidator.equals("page 1 returns 2 members", page1Limit2.data.length, 2);
  TestValidator.equals(
    "pagination page is 1",
    page1Limit2.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    page1Limit2.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination total records is 6",
    page1Limit2.pagination.records,
    6,
  );
  TestValidator.equals(
    "pagination total pages is 3",
    page1Limit2.pagination.pages,
    3,
  );

  // Step 9: Test pagination with page=2, limit=2
  const page2Limit2: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(
      primaryConnection,
      {
        memberId: primaryMember.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies ICommunityPlatformMemberFollower.IRequest,
      },
    );
  typia.assert(page2Limit2);
  TestValidator.equals("page 2 returns 2 members", page2Limit2.data.length, 2);
  TestValidator.equals(
    "pagination page is 2",
    page2Limit2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 2",
    page2Limit2.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page 2 records different from page 1",
    page2Limit2.data[0].id === page1Limit2.data[0].id,
    false,
  );

  // Step 10: Test pagination with page=3, limit=2
  const page3Limit2: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(
      primaryConnection,
      {
        memberId: primaryMember.id,
        body: {
          page: 3,
          limit: 2,
        } satisfies ICommunityPlatformMemberFollower.IRequest,
      },
    );
  typia.assert(page3Limit2);
  TestValidator.equals("page 3 returns 2 members", page3Limit2.data.length, 2);
  TestValidator.equals(
    "pagination page is 3",
    page3Limit2.pagination.current,
    3,
  );

  // Step 11: Test pagination with page=10 (beyond available pages)
  const pageOutOfRange: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(
      primaryConnection,
      {
        memberId: primaryMember.id,
        body: {
          page: 10,
          limit: 2,
        } satisfies ICommunityPlatformMemberFollower.IRequest,
      },
    );
  typia.assert(pageOutOfRange);
  TestValidator.equals(
    "out of range page returns empty data",
    pageOutOfRange.data.length,
    0,
  );
  TestValidator.equals(
    "out of range page shows correct total records",
    pageOutOfRange.pagination.records,
    6,
  );

  // Step 12: Test edge case with limit=1
  const limitOne: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(
      primaryConnection,
      {
        memberId: primaryMember.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformMemberFollower.IRequest,
      },
    );
  typia.assert(limitOne);
  TestValidator.equals("limit=1 returns 1 member", limitOne.data.length, 1);
  TestValidator.equals(
    "limit=1 total pages is 6",
    limitOne.pagination.pages,
    6,
  );

  // Step 13: Test edge case with limit=100 (maximum)
  const limitMax: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.following.index(
      primaryConnection,
      {
        memberId: primaryMember.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformMemberFollower.IRequest,
      },
    );
  typia.assert(limitMax);
  TestValidator.equals(
    "limit=100 returns all 6 members",
    limitMax.data.length,
    6,
  );
  TestValidator.equals(
    "limit=100 total pages is 1",
    limitMax.pagination.pages,
    1,
  );

  // Step 14: Verify pagination metadata consistency across all requests
  TestValidator.predicate(
    "all requests show same total records",
    () =>
      page1Limit2.pagination.records === page2Limit2.pagination.records &&
      page2Limit2.pagination.records === page3Limit2.pagination.records &&
      page3Limit2.pagination.records === pageOutOfRange.pagination.records &&
      pageOutOfRange.pagination.records === limitOne.pagination.records &&
      limitOne.pagination.records === limitMax.pagination.records &&
      limitMax.pagination.records === 6,
  );

  TestValidator.predicate(
    "pagination calculations are correct for limit=1",
    () =>
      limitOne.pagination.pages ===
      Math.ceil(limitOne.pagination.records / limitOne.pagination.limit),
  );

  TestValidator.predicate(
    "pagination calculations are correct for limit=2",
    () =>
      page1Limit2.pagination.pages ===
      Math.ceil(page1Limit2.pagination.records / page1Limit2.pagination.limit),
  );
}
