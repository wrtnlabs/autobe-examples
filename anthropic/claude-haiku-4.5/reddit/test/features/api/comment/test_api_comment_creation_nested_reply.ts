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

export async function test_api_comment_creation_nested_reply(
  connection: api.IConnection,
) {
  // Step 1: Create admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphabets(12);
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphaNumeric(8),
      password: member1Password,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Step 4: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphabets(12);
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphaNumeric(8),
      password: member2Password,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Step 5: Login as member1 and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create a post in the community
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

  // Step 7: Create top-level comment by member1
  const topLevelComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(topLevelComment);

  // Verify top-level comment properties
  TestValidator.equals(
    "top-level comment nesting depth",
    topLevelComment.nesting_depth,
    0,
  );
  TestValidator.predicate(
    "top-level comment has no parent",
    topLevelComment.community_platform_parent_comment_id === null ||
      topLevelComment.community_platform_parent_comment_id === undefined,
  );
  TestValidator.equals(
    "top-level comment post_id",
    topLevelComment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "top-level comment initial child count",
    topLevelComment.child_comment_count,
    0,
  );

  // Step 8: Login as member2 and create nested reply
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const nestedReply =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: topLevelComment.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(nestedReply);

  // Step 9: Verify nested reply properties
  TestValidator.equals(
    "nested reply nesting depth",
    nestedReply.nesting_depth,
    1,
  );
  TestValidator.equals(
    "nested reply parent_comment_id",
    nestedReply.community_platform_parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "nested reply post_id",
    nestedReply.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "nested reply initial visibility",
    nestedReply.visibility_status,
    "visible",
  );
  TestValidator.equals(
    "nested reply initial child count",
    nestedReply.child_comment_count,
    0,
  );
  TestValidator.equals(
    "nested reply creator",
    nestedReply.creator.id,
    member2.id,
  );

  // Step 10: Create multiple levels of nested replies to test threading depth
  let currentParent = nestedReply;
  const threadChain: ICommunityPlatformComment[] = [
    topLevelComment,
    nestedReply,
  ];

  // Create comments up to depth 5 to test multi-level threading
  for (let depth = 2; depth <= 5; depth++) {
    const deepNestedReply =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: currentParent.id,
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(deepNestedReply);

    // Verify each level has correct nesting depth
    TestValidator.equals(
      `depth ${depth} comment nesting depth`,
      deepNestedReply.nesting_depth,
      depth,
    );
    TestValidator.equals(
      `depth ${depth} parent_comment_id`,
      deepNestedReply.community_platform_parent_comment_id,
      currentParent.id,
    );
    TestValidator.equals(
      `depth ${depth} post_id`,
      deepNestedReply.community_platform_post_id,
      post.id,
    );

    threadChain.push(deepNestedReply);
    currentParent = deepNestedReply;
  }

  // Step 11: Verify the complete threading structure
  TestValidator.predicate(
    "thread chain has correct length",
    threadChain.length === 6,
  );

  // Verify parent-child relationships throughout the chain
  for (let i = 1; i < threadChain.length; i++) {
    TestValidator.equals(
      `comment at index ${i} parent matches index ${i - 1}`,
      threadChain[i].community_platform_parent_comment_id,
      threadChain[i - 1].id,
    );
    TestValidator.equals(
      `comment at index ${i} depth is ${i}`,
      threadChain[i].nesting_depth,
      i,
    );
  }

  // Step 12: Verify engagement metrics and visibility
  for (const comment of threadChain) {
    TestValidator.equals(
      `comment ${comment.id} initial vote score`,
      comment.vote_score,
      0,
    );
    TestValidator.equals(
      `comment ${comment.id} initial upvote count`,
      comment.upvote_count,
      0,
    );
    TestValidator.equals(
      `comment ${comment.id} initial downvote count`,
      comment.downvote_count,
      0,
    );
    TestValidator.equals(
      `comment ${comment.id} visibility status`,
      comment.visibility_status,
      "visible",
    );
    TestValidator.predicate(
      `comment ${comment.id} is not locked`,
      !comment.is_locked,
    );
  }

  // Verify all comments reference the same post
  TestValidator.predicate(
    "all comments in thread reference same post",
    threadChain.every((c) => c.community_platform_post_id === post.id),
  );
}
