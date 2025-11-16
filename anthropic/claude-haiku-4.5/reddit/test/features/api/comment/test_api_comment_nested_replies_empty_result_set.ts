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
 * Test retrieval of nested replies when a parent comment has no children.
 *
 * This test validates the edge case where a parent comment exists but has not
 * received any nested child replies yet. The test creates a complete community
 * structure (member, category, community, post, and parent comment), then
 * queries for nested replies using PATCH /comments/{commentId}/comments. The
 * API should return an empty data array with pagination metadata showing
 * records=0 and pages=0, confirming proper handling of the empty result set
 * without throwing errors.
 *
 * Steps:
 *
 * 1. Create administrator account and member account for multi-actor setup
 * 2. Administrator creates a category for organizing communities
 * 3. Member creates a community within the category
 * 4. Member creates a post within the community
 * 5. Member creates a parent comment on the post (no child replies)
 * 6. Query nested replies for the parent comment with standard page size
 * 7. Verify response returns empty data array with pagination records=0, pages=0
 * 8. Query nested replies with different page sizes (20, 100)
 * 9. Verify all queries consistently return empty results
 * 10. Confirm no error is thrown and operation handles empty reply set correctly
 */
export async function test_api_comment_nested_replies_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: administratorEmail,
        password: "TestPass123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 1b: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPass123!",
      href: "http://localhost:3000/register",
      referrer: "",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Administrator creates a category
  const category =
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

  // Step 3: Member creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Member creates a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Member creates a parent comment on the post (without child replies)
  const parentComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);
  TestValidator.predicate(
    "parent comment created successfully",
    parentComment.id !== null,
  );
  TestValidator.predicate(
    "parent comment has no child replies yet",
    parentComment.child_comment_count === 0,
  );

  // Step 6: Query nested replies for the parent comment with standard page size
  const emptyRepliesDefault =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        sort_by: "best",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(emptyRepliesDefault);

  // Step 7: Verify response returns empty data array with pagination metadata
  TestValidator.equals(
    "empty replies data array",
    emptyRepliesDefault.data,
    [],
  );
  TestValidator.equals(
    "pagination records should be 0",
    emptyRepliesDefault.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    emptyRepliesDefault.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    emptyRepliesDefault.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    emptyRepliesDefault.pagination.limit,
    20,
  );

  // Step 8: Query nested replies with different page sizes
  const emptyRepliesSmallPage =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 5,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(emptyRepliesSmallPage);

  const emptyRepliesLargePage =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 100,
        sort_by: "top",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(emptyRepliesLargePage);

  // Step 9: Verify all queries consistently return empty results
  TestValidator.equals(
    "small page results are empty",
    emptyRepliesSmallPage.data,
    [],
  );
  TestValidator.equals(
    "small page records is 0",
    emptyRepliesSmallPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "small page count is 0",
    emptyRepliesSmallPage.pagination.pages,
    0,
  );

  TestValidator.equals(
    "large page results are empty",
    emptyRepliesLargePage.data,
    [],
  );
  TestValidator.equals(
    "large page records is 0",
    emptyRepliesLargePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "large page count is 0",
    emptyRepliesLargePage.pagination.pages,
    0,
  );

  // Step 10: Confirm operation handles empty reply set correctly
  TestValidator.predicate("empty result set is valid scenario", true);
}
