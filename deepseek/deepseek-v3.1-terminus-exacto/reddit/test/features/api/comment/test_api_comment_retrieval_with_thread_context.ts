import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test comment retrieval within threaded discussion context.
 *
 * This test validates the complete lifecycle of threaded comments:
 *
 * 1. Member authentication and community/post creation
 * 2. Parent comment creation as thread root
 * 3. Child reply comments with parent references
 * 4. Comment retrieval with proper thread context
 * 5. Validation of reply counts and post context
 * 6. Testing comment status visibility rules
 */
export async function test_api_comment_retrieval_with_thread_context(
  connection: api.IConnection,
) {
  // 1. Create member authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community for discussion
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create post to host threaded discussion
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create parent comment for thread
  const parentComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);

  // 5. Create first child reply comment
  const firstChildComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        parent_id: parentComment.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(firstChildComment);

  // 6. Create second child reply comment
  const secondChildComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        parent_id: parentComment.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(secondChildComment);

  // 7. Retrieve parent comment and validate thread context
  const retrievedParent = await api.functional.communityPlatform.comments.at(
    connection,
    {
      commentId: parentComment.id,
    },
  );
  typia.assert(retrievedParent);
  TestValidator.equals(
    "parent comment ID matches",
    retrievedParent.id,
    parentComment.id,
  );
  TestValidator.equals(
    "parent comment has correct reply count",
    retrievedParent.reply_count,
    2,
  );
  TestValidator.equals(
    "parent comment post context matches",
    retrievedParent.post.id,
    post.id,
  );

  // 8. Retrieve child comments and validate parent reference
  const retrievedFirstChild =
    await api.functional.communityPlatform.comments.at(connection, {
      commentId: firstChildComment.id,
    });
  typia.assert(retrievedFirstChild);
  TestValidator.equals(
    "first child comment ID matches",
    retrievedFirstChild.id,
    firstChildComment.id,
  );
  typia.assert(retrievedFirstChild.parent);
  TestValidator.equals(
    "first child has correct parent reference",
    retrievedFirstChild.parent!.id,
    parentComment.id,
  );

  const retrievedSecondChild =
    await api.functional.communityPlatform.comments.at(connection, {
      commentId: secondChildComment.id,
    });
  typia.assert(retrievedSecondChild);
  TestValidator.equals(
    "second child comment ID matches",
    retrievedSecondChild.id,
    secondChildComment.id,
  );
  typia.assert(retrievedSecondChild.parent);
  TestValidator.equals(
    "second child has correct parent reference",
    retrievedSecondChild.parent!.id,
    parentComment.id,
  );

  // 9. Validate post context for all comments
  TestValidator.equals(
    "parent comment post context",
    retrievedParent.post.id,
    post.id,
  );
  TestValidator.equals(
    "first child comment post context",
    retrievedFirstChild.post.id,
    post.id,
  );
  TestValidator.equals(
    "second child comment post context",
    retrievedSecondChild.post.id,
    post.id,
  );

  // 10. Test comment status visibility (all comments should be published and visible)
  TestValidator.equals(
    "parent comment status is published",
    retrievedParent.status,
    "published",
  );
  TestValidator.equals(
    "first child comment status is published",
    retrievedFirstChild.status,
    "published",
  );
  TestValidator.equals(
    "second child comment status is published",
    retrievedSecondChild.status,
    "published",
  );

  // Additional validation: Ensure thread structure is maintained
  TestValidator.notEquals(
    "parent and child comments have different IDs",
    parentComment.id,
    firstChildComment.id,
  );
  TestValidator.notEquals(
    "child comments have different IDs",
    firstChildComment.id,
    secondChildComment.id,
  );
}
