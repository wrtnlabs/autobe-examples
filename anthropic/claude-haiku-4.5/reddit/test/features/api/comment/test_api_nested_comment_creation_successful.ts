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

/**
 * Test successful creation of a nested reply to an existing comment.
 *
 * This test validates the complete nested comment creation workflow in the
 * community platform. It ensures that members can reply to existing comments
 * with proper parent-child relationships, correct depth calculation, and all
 * required fields properly initialized.
 *
 * The test workflow:
 *
 * 1. Create administrator account and authenticate
 * 2. Create a community category
 * 3. Create a regular member account and authenticate
 * 4. Create a community in the platform
 * 5. Create a post within the community
 * 6. Create a top-level comment on the post
 * 7. Create a nested reply to the top-level comment
 * 8. Validate all nested comment fields and properties
 */
export async function test_api_nested_comment_creation_successful(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category
  const categoryName = RandomGenerator.name();
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create a top-level comment on the post
  const topLevelComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(topLevelComment);

  // Verify top-level comment properties
  TestValidator.equals(
    "top-level comment nesting depth",
    topLevelComment.nesting_depth,
    0,
  );
  TestValidator.equals(
    "top-level comment visibility is visible",
    topLevelComment.visibility_status,
    "visible",
  );
  TestValidator.equals(
    "top-level comment vote score initialized to zero",
    topLevelComment.vote_score,
    0,
  );
  TestValidator.equals(
    "top-level comment upvote count initialized to zero",
    topLevelComment.upvote_count,
    0,
  );
  TestValidator.equals(
    "top-level comment downvote count initialized to zero",
    topLevelComment.downvote_count,
    0,
  );
  TestValidator.equals(
    "top-level comment is not locked",
    topLevelComment.is_locked,
    false,
  );

  // Step 7: Create a nested reply to the top-level comment
  const nestedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.comments.create(
      connection,
      {
        commentId: topLevelComment.id,
        body: {
          post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(nestedComment);

  // Step 8: Validate nested comment fields and properties
  // Verify basic structure
  TestValidator.predicate(
    "nested comment has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      nestedComment.id,
    ),
  );

  // Verify parent reference
  TestValidator.equals(
    "nested comment has correct parent comment id",
    nestedComment.community_platform_parent_comment_id,
    topLevelComment.id,
  );

  // Verify post reference
  TestValidator.equals(
    "nested comment references correct post",
    nestedComment.community_platform_post_id,
    post.id,
  );

  // Verify nesting depth
  TestValidator.equals(
    "nested comment nesting depth is 1",
    nestedComment.nesting_depth,
    1,
  );

  // Verify vote counts initialization
  TestValidator.equals(
    "nested comment vote score initialized to zero",
    nestedComment.vote_score,
    0,
  );
  TestValidator.equals(
    "nested comment upvote count initialized to zero",
    nestedComment.upvote_count,
    0,
  );
  TestValidator.equals(
    "nested comment downvote count initialized to zero",
    nestedComment.downvote_count,
    0,
  );

  // Verify visibility
  TestValidator.equals(
    "nested comment visibility is visible",
    nestedComment.visibility_status,
    "visible",
  );

  // Verify lock status
  TestValidator.equals(
    "nested comment is not locked",
    nestedComment.is_locked,
    false,
  );

  // Verify child comment count
  TestValidator.equals(
    "nested comment has zero child comments initially",
    nestedComment.child_comment_count,
    0,
  );

  // Verify required embedded objects
  TestValidator.predicate(
    "nested comment has creator member summary",
    nestedComment.creator !== null &&
      nestedComment.creator !== undefined &&
      nestedComment.creator.id !== undefined &&
      nestedComment.creator.username !== undefined,
  );

  TestValidator.predicate(
    "nested comment has post summary",
    nestedComment.post !== null &&
      nestedComment.post !== undefined &&
      nestedComment.post.id !== undefined &&
      nestedComment.post.title !== undefined,
  );

  // Verify content is preserved
  TestValidator.predicate(
    "nested comment content is not empty",
    nestedComment.content.length > 0,
  );

  // Verify timestamps are present
  TestValidator.predicate(
    "nested comment has created_at timestamp",
    nestedComment.created_at !== null &&
      nestedComment.created_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(nestedComment.created_at),
  );

  TestValidator.predicate(
    "nested comment has updated_at timestamp",
    nestedComment.updated_at !== null &&
      nestedComment.updated_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(nestedComment.updated_at),
  );

  // Verify deleted_at is null for newly created comment
  TestValidator.equals(
    "nested comment deleted_at is null",
    nestedComment.deleted_at,
    null,
  );

  // Verify creator is the authenticated member
  TestValidator.equals(
    "nested comment creator is the authenticated member",
    nestedComment.creator.id,
    member.id,
  );

  // Verify post reference in embedded summary
  TestValidator.equals(
    "nested comment embedded post id matches",
    nestedComment.post.id,
    post.id,
  );
}
