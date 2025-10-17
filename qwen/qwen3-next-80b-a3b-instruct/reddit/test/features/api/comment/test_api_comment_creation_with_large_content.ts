import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_comment_creation_with_large_content(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphabets(12),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create a community for the post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        post_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Create a comment with exactly 2000 characters (max limit)
  // Construct deterministic 2000-character string
  const maxCharContent = ArrayUtil.repeat(2000, () => "x").join("");

  // Validate content is exactly 2000 characters
  TestValidator.equals(
    "comment content length should be exactly 2000 characters",
    maxCharContent.length,
    2000,
  );

  const createdComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: maxCharContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(createdComment);

  // 5. Verify that a comment with more than 2000 characters is rejected
  // Construct deterministic 2001-character string
  const overLimitContent = ArrayUtil.repeat(2001, () => "x").join("");

  // Validate content is exactly 2001 characters
  TestValidator.equals(
    "over-limit content length should be exactly 2001 characters",
    overLimitContent.length,
    2001,
  );

  // This should fail with validation error
  await TestValidator.error(
    "should reject comment with content longer than 2000 characters",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            content: overLimitContent,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
