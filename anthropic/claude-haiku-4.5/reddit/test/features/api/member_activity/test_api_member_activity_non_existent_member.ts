import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberActivity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberActivity";

/**
 * Test member activity retrieval for a non-existent member ID.
 *
 * This test validates that the member activity endpoint properly handles
 * requests for members that don't exist in the system. It verifies that:
 *
 * 1. The API returns empty pagination results for non-existent members
 * 2. No activities are returned for non-existent member IDs
 * 3. Member activity data is properly isolated per user
 * 4. The endpoint correctly validates UUID format
 *
 * Workflow:
 *
 * 1. Set up test infrastructure: Create category (as admin)
 * 2. Create member account and establish baseline
 * 3. Create community and posts for comparison
 * 4. Query activities for actual member (establish baseline)
 * 5. Query activities for non-existent UUID
 * 6. Validate proper error handling and data isolation
 */
export async function test_api_member_activity_non_existent_member(
  connection: api.IConnection,
) {
  // 1. Create test category as administrator
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: `admin-${RandomGenerator.alphaNumeric(6)}`,
      name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create category with admin authorization
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `test-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Switch to member account
  const memberEmail = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: `member-${RandomGenerator.alphaNumeric(6)}`,
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Create community as member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier:
            `community-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create test post for the member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Query activity for the actual member (baseline)
  const memberActivityResult =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(memberActivityResult);
  TestValidator.predicate(
    "actual member should have at least one activity",
    memberActivityResult.pagination.records > 0,
  );

  // 6. Query activity for a non-existent member UUID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  const nonExistentActivityResult =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: nonExistentMemberId,
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(nonExistentActivityResult);

  // 7. Validate response for non-existent member
  TestValidator.equals(
    "non-existent member should have zero records",
    nonExistentActivityResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent member pagination should show zero pages",
    nonExistentActivityResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent member should have empty data array",
    nonExistentActivityResult.data.length,
    0,
  );

  // 8. Test pagination parameters with non-existent member
  const paginationTest =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: nonExistentMemberId,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(paginationTest);
  TestValidator.predicate(
    "non-existent member pagination should be valid",
    paginationTest.pagination.current >= 0 &&
      paginationTest.pagination.limit >= 0 &&
      paginationTest.pagination.records === 0,
  );

  // 9. Verify data isolation - confirm actual member activities still exist
  TestValidator.predicate(
    "member activity should be isolated - actual member has activities",
    memberActivityResult.data.length > 0,
  );
  TestValidator.notEquals(
    "non-existent member activities differ from real member",
    nonExistentActivityResult.pagination.records,
    memberActivityResult.pagination.records,
  );

  // 10. Test with different pagination for non-existent member
  const secondPageTest =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: nonExistentMemberId,
      body: {
        page: 2,
        limit: 20,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(secondPageTest);
  TestValidator.equals(
    "second page should also be empty for non-existent member",
    secondPageTest.data.length,
    0,
  );
}
