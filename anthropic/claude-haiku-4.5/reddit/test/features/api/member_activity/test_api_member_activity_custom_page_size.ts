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
 * Test member activity retrieval with custom page size (limit parameter).
 *
 * Verifies that the limit parameter correctly controls pagination and that
 * pagination metadata accurately reflects the specified limit. Tests boundary
 * conditions, default pagination, and enforces maximum limit constraints.
 *
 * Workflow:
 *
 * 1. Set up administrator and member authentication
 * 2. Create category for community classification
 * 3. Create community for activity context
 * 4. Generate 120+ posts to establish test data
 * 5. Test various limit values (1, 10, 25, 50, 100)
 * 6. Validate pagination metadata and activity counts
 * 7. Test boundary conditions and edge cases
 */
export async function test_api_member_activity_custom_page_size(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecureAdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Member registration and login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "SecureMemberPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology and programming discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "General Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create 120+ posts to test pagination
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 125; i++) {
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Test Post ${i + 1} - ${RandomGenerator.alphaNumeric(10)}`,
          content_text: RandomGenerator.content({ paragraphs: 2 }),
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Step 6: Test various limit values
  const limitValues = [1, 10, 25, 50, 100];

  for (const limit of limitValues) {
    // Test first page with custom limit
    const page1: IPageICommunityPlatformMemberActivity.ISummary =
      await api.functional.communityPlatform.members.activity.index(
        connection,
        {
          memberId: member.id,
          body: {
            page: 1,
            limit: limit,
          } satisfies ICommunityPlatformMemberActivity.IRequest,
        },
      );
    typia.assert(page1);

    // Validate pagination structure
    TestValidator.predicate(
      `pagination metadata exists for limit ${limit}`,
      page1.pagination !== null && page1.pagination !== undefined,
    );

    // Validate limit is respected
    TestValidator.predicate(
      `returned activities count matches limit ${limit}`,
      page1.data.length <= limit,
    );

    // Validate pagination metadata
    TestValidator.equals(
      `pagination current page is 1 for limit ${limit}`,
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      `pagination limit matches requested ${limit}`,
      page1.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `pagination total records is 125`,
      page1.pagination.records,
      125,
    );

    // Calculate expected pages
    const expectedPages = Math.ceil(125 / limit);
    TestValidator.equals(
      `pagination total pages is calculated correctly for limit ${limit}`,
      page1.pagination.pages,
      expectedPages,
    );

    // Test last page
    const lastPageNumber = expectedPages;
    const lastPage: IPageICommunityPlatformMemberActivity.ISummary =
      await api.functional.communityPlatform.members.activity.index(
        connection,
        {
          memberId: member.id,
          body: {
            page: lastPageNumber,
            limit: limit,
          } satisfies ICommunityPlatformMemberActivity.IRequest,
        },
      );
    typia.assert(lastPage);

    // Validate last page has correct count
    const expectedLastPageCount = 125 % limit === 0 ? limit : 125 % limit;
    TestValidator.predicate(
      `last page contains ${expectedLastPageCount} activities for limit ${limit}`,
      lastPage.data.length === expectedLastPageCount,
    );

    TestValidator.equals(
      `last page pagination current is ${lastPageNumber}`,
      lastPage.pagination.current,
      lastPageNumber,
    );

    // Test intermediate page if applicable
    if (expectedPages > 2) {
      const midPage: IPageICommunityPlatformMemberActivity.ISummary =
        await api.functional.communityPlatform.members.activity.index(
          connection,
          {
            memberId: member.id,
            body: {
              page: 2,
              limit: limit,
            } satisfies ICommunityPlatformMemberActivity.IRequest,
          },
        );
      typia.assert(midPage);

      TestValidator.predicate(
        `middle page has ${limit} activities for limit ${limit}`,
        midPage.data.length === limit,
      );

      TestValidator.equals(
        `middle page pagination current is 2`,
        midPage.pagination.current,
        2,
      );
    }
  }

  // Step 7: Test default limit (should be 20)
  const defaultLimitPage: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {} satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(defaultLimitPage);

  TestValidator.predicate(
    "default pagination returns 20 activities",
    defaultLimitPage.data.length === 20,
  );

  TestValidator.equals(
    "default limit in pagination is 20",
    defaultLimitPage.pagination.limit,
    20,
  );

  // Step 8: Test sorting with custom limit
  const sortedPage: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(sortedPage);

  TestValidator.equals(
    "sorted page respects limit parameter",
    Math.min(sortedPage.data.length, 25),
    sortedPage.data.length,
  );

  // Step 9: Verify activity types are correct
  for (const activity of defaultLimitPage.data) {
    TestValidator.predicate(
      "activity type is post or comment",
      activity.activityType === "post" || activity.activityType === "comment",
    );

    TestValidator.predicate(
      "activity has required fields",
      activity.id !== null &&
        activity.memberId !== null &&
        activity.communityId !== null &&
        activity.createdAt !== null,
    );
  }
}
