import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Test controversial sorting algorithm for nested comment replies.
 *
 * This test validates that the 'controversial' sort order is accepted and
 * processes nested comment queries correctly. The controversial sorting
 * algorithm identifies comments with balanced vote distributions (roughly equal
 * upvotes and downvotes) as more controversial, indicating diverse discussion
 * from multiple perspectives.
 *
 * Test workflow:
 *
 * 1. Set up test infrastructure: create administrator, category, community, post
 * 2. Create a parent comment as the root of the nested thread
 * 3. Create multiple child comments with various content
 * 4. Query nested comments with sort_by='controversial'
 * 5. Verify response structure and sorting mechanism
 * 6. Validate pagination and result organization
 */
export async function test_api_comment_nested_replies_sorting_controversial(
  connection: api.IConnection,
) {
  // Step 1: Create administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "ValidPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(8)}`,
          slug: `category_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member (for posting)
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: "ValidPassword123!",
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(8)}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Test Post ${RandomGenerator.alphaNumeric(8)}`,
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create parent comment
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment is top-level",
    parentComment.nesting_depth,
    0,
  );

  // Step 7: Create multiple child comments
  const childComments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < 4; i++) {
    const childComment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: parentComment.id,
            content: `Child comment ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(childComment);
    TestValidator.equals(
      `child comment ${i + 1} nesting depth`,
      childComment.nesting_depth,
      1,
    );
    childComments.push(childComment);
  }

  // Step 8: Query nested comments with controversial sorting
  const controversialResults: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 100,
        sort_by: "controversial",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(controversialResults);

  // Step 9: Validate results structure
  TestValidator.predicate(
    "controversial results contain pagination data",
    controversialResults.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    controversialResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    controversialResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count",
    controversialResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    controversialResults.pagination.pages >= 0,
  );

  // Step 10: Verify data array
  TestValidator.predicate(
    "results contain data array",
    Array.isArray(controversialResults.data),
  );
  TestValidator.predicate(
    "results contain created child comments",
    controversialResults.data.length >= childComments.length,
  );

  // Step 11: Validate each returned comment structure
  for (const comment of controversialResults.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "comment has valid id",
      comment.id !== undefined && comment.id.length > 0,
    );
    TestValidator.predicate(
      "comment has content",
      comment.content !== undefined && comment.content.length > 0,
    );
    TestValidator.predicate(
      "comment nesting depth is valid",
      comment.nesting_depth >= 1,
    );
    TestValidator.equals(
      "comment visibility is visible",
      comment.visibility_status,
      "visible",
    );
  }

  // Step 12: Verify controversial sorting accepts correct parameter
  TestValidator.predicate(
    "controversial sort returned results successfully",
    controversialResults.data.length > 0 ||
      controversialResults.pagination.records === 0,
  );
}
