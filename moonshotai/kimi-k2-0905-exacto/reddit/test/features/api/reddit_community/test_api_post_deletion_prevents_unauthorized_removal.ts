import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test strict ownership validation ensuring only post authors can delete their
 * content. Validates that members cannot delete posts created by other users
 * while allowing proper deletion by the original author, maintaining strict
 * access control for content management and preventing unauthorized content
 * removal attempts.
 */
export async function test_api_post_deletion_prevents_unauthorized_removal(
  connection: api.IConnection,
) {
  // Step 1: Create first member and their post with proper authentication
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberNickname = RandomGenerator.alphabets(8);
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      nickname: firstMemberNickname,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Create first member's post directly - this validates immediate ownership
  const postData = {
    title: `Test Post by ${firstMemberNickname} - ${Math.random()}`,
    content: RandomGenerator.paragraph({ sentences: 5 }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post author should be first member",
    post.author.id,
    firstMember.id,
  );

  // Step 3: Create second member and attempt unauthorized deletion
  const secondMemberConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberNickname = RandomGenerator.alphabets(8);
  const secondMember = await api.functional.auth.member.join(
    secondMemberConnection,
    {
      body: {
        email: secondMemberEmail,
        nickname: secondMemberNickname,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditCommunityMember.ICreate,
    },
  );
  typia.assert(secondMember);

  // Step 4: Attempt unauthorized deletion by second member (must fail)
  await TestValidator.error(
    "second member cannot delete first member's post",
    async () => {
      await api.functional.redditCommunity.member.posts.erase(
        secondMemberConnection,
        {
          postId: post.id,
        },
      );
    },
  );

  // Step 5: First member successfully deletes their own post
  const deletedPost = await api.functional.redditCommunity.member.posts.erase(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(deletedPost);

  // Verification: The deleted post returns complete data but the operation succeeds
  TestValidator.equals(
    "deleted post should have same ID as original",
    deletedPost.id,
    post.id,
  );
  TestValidator.equals(
    "deleted post content should match original",
    deletedPost.title,
    post.title,
  );
}
