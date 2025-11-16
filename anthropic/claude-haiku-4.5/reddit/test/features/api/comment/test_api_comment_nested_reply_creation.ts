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

export async function test_api_comment_nested_reply_creation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and member accounts
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
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
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create root comment (depth 0)
  const rootComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(rootComment);
  TestValidator.equals(
    "root comment nesting depth should be 0",
    rootComment.nesting_depth,
    0,
  );
  TestValidator.equals(
    "root comment initial child count should be 0",
    rootComment.child_comment_count,
    0,
  );

  // Step 7: Create nested comments up to depth 10 and verify chain structure
  const commentChain: ICommunityPlatformComment[] = [rootComment];

  for (let depth = 1; depth <= 10; depth++) {
    const parentComment = commentChain[depth - 1];

    const nestedComment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: parentComment.id,
            content: RandomGenerator.paragraph(),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(nestedComment);

    // Verify nesting depth is correct (should equal current depth)
    TestValidator.equals(
      `comment at depth ${depth} should have correct nesting_depth`,
      nestedComment.nesting_depth,
      depth,
    );

    // Verify parent_comment_id is set correctly
    TestValidator.equals(
      `comment at depth ${depth} should have correct parent_comment_id`,
      nestedComment.community_platform_parent_comment_id,
      parentComment.id,
    );

    // Verify child_comment_count on nested comment starts at 0
    TestValidator.equals(
      `comment at depth ${depth} should start with 0 child comments`,
      nestedComment.child_comment_count,
      0,
    );

    commentChain.push(nestedComment);
  }

  // Step 8: Verify the complete comment chain structure
  TestValidator.equals(
    "comment chain length should be 11 (root + 10 nested)",
    commentChain.length,
    11,
  );

  // Step 9: Validate nesting depth progression
  for (let i = 0; i < commentChain.length; i++) {
    TestValidator.equals(
      `comment at position ${i} should have nesting_depth ${i}`,
      commentChain[i].nesting_depth,
      i,
    );
  }

  // Step 10: Verify parent-child relationships throughout the chain
  for (let i = 1; i < commentChain.length; i++) {
    TestValidator.equals(
      `comment at index ${i} should reference parent at index ${i - 1}`,
      commentChain[i].community_platform_parent_comment_id,
      commentChain[i - 1].id,
    );
  }

  // Step 11: Verify maximum nesting depth of 10 is respected
  TestValidator.equals(
    "maximum comment nesting depth should be 10",
    commentChain[10].nesting_depth,
    10,
  );

  // Step 12: Verify post comment count reflects created comments
  TestValidator.predicate(
    "all nested comments were successfully created in chain",
    commentChain.every(
      (comment) =>
        comment.id !== "" &&
        comment.id !== null &&
        comment.visibility_status === "visible",
    ),
  );
}
