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
 * Test creation of comments at multiple nesting levels up to the maximum depth
 * of 10.
 *
 * This test validates the hierarchical threading structure of comments by:
 *
 * 1. Setting up prerequisite infrastructure (member, administrator, category,
 *    community, post)
 * 2. Creating a chain of nested comments from depth 0 to depth 10
 * 3. Verifying nesting_depth is correctly calculated at each level
 * 4. Verifying parent_comment_id links form a proper chain
 * 5. Verifying child_comment_count increments on parent comments
 *
 * Steps:
 *
 * 1. Administrator creates a category for community classification
 * 2. Member creates a community in that category
 * 3. Member creates an initial post in the community
 * 4. Member creates a top-level comment (depth 0) on the post
 * 5. Member creates nested replies at depths 1-10, each replying to the previous
 *    level's comment
 * 6. Verify nesting_depth increments correctly from 0 to 10
 * 7. Verify parent_comment_id chain properly links all comments
 * 8. Verify child_comment_count reflects the number of direct child comments
 */
export async function test_api_comment_creation_multiple_levels_nesting(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Administrator creates a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Tech discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(12),
      password: "MemberPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Member creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News",
          identifier: RandomGenerator.alphabets(10),
          description: "Latest technology news and discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Member creates a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Discussion: Deep Nested Comments",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Create top-level comment (depth 0)
  const topLevelComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(topLevelComment);
  TestValidator.equals(
    "top-level comment nesting_depth",
    topLevelComment.nesting_depth,
    0,
  );
  TestValidator.equals(
    "top-level comment parent_comment_id",
    topLevelComment.community_platform_parent_comment_id,
    null,
  );
  TestValidator.equals(
    "top-level comment child_comment_count",
    topLevelComment.child_comment_count,
    0,
  );

  // Create nested comments chain from depth 1 to depth 10
  const commentChain: ICommunityPlatformComment[] = [topLevelComment];

  for (let depth = 1; depth <= 10; depth++) {
    const parentComment = commentChain[depth - 1];

    const nestedComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: parentComment.id,
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(nestedComment);

    // Verify nesting_depth is correctly incremented
    TestValidator.equals(
      `comment depth ${depth} nesting_depth should be ${depth}`,
      nestedComment.nesting_depth,
      depth,
    );

    // Verify parent_comment_id links to the direct parent
    TestValidator.equals(
      `comment depth ${depth} parent_comment_id should link to parent`,
      nestedComment.community_platform_parent_comment_id,
      parentComment.id,
    );

    // Verify post_id is consistent
    TestValidator.equals(
      `comment depth ${depth} post_id should match the original post`,
      nestedComment.community_platform_post_id,
      post.id,
    );

    commentChain.push(nestedComment);
  }

  // Verify the complete chain has 11 comments (depth 0-10)
  TestValidator.equals(
    "comment chain length should be 11 (depth 0-10)",
    commentChain.length,
    11,
  );

  // Verify parent-child relationships by checking nesting_depth progression
  for (let i = 0; i < commentChain.length; i++) {
    TestValidator.equals(
      `comment at index ${i} should have nesting_depth equal to ${i}`,
      commentChain[i].nesting_depth,
      i,
    );

    if (i > 0) {
      TestValidator.equals(
        `comment at index ${i} parent should link to comment at index ${i - 1}`,
        commentChain[i].community_platform_parent_comment_id,
        commentChain[i - 1].id,
      );
    } else {
      TestValidator.equals(
        `top-level comment should have null parent`,
        commentChain[i].community_platform_parent_comment_id,
        null,
      );
    }
  }

  // Verify all comments belong to the same post
  for (const comment of commentChain) {
    TestValidator.equals(
      `all comments should belong to the same post`,
      comment.community_platform_post_id,
      post.id,
    );
  }
}
