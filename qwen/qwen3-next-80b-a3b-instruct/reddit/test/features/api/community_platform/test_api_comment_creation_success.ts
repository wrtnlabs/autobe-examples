import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_comment_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated member account (join)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphaNumeric(10);
  const memberPassword: string = typia.random<
    string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // Step 2: Create a community with comment moderation disabled
  const communityName: string = RandomGenerator.alphaNumeric(8);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Immediately verify the community's comment moderation is disabled (required for 'published' status)
  TestValidator.equals(
    "comment moderation disabled",
    community.commentReviewMode,
    false,
  );

  // Step 3: Create a post within the community
  const postTitle: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const postContent: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: postTitle,
        content: postContent,
        post_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post (success scenario)
  const commentContent: string = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: commentContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 5: Validate the comment creation
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment is associated with correct post",
    comment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment author is the authenticated member",
    comment.author_id,
    member.id,
  );
  TestValidator.equals(
    "comment depth level is 1 (direct reply)",
    comment.depth_level,
    1,
  );
  TestValidator.equals(
    "comment status is 'published' (moderation disabled)",
    comment.status,
    "published",
  );
  TestValidator.predicate(
    "comment content length is within limit",
    comment.content.length <= 2000,
  );
}
