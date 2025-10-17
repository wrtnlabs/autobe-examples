import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_comment_creation_on_post(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member to establish context for comment creation
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // Step 2: Create a community where the post will be created
  const communityName: string =
    RandomGenerator.name(1)
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-]/g, "-") +
    "-" +
    RandomGenerator.alphaNumeric(4);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create a post to serve as the parent for the comment
  const postTitle: string = RandomGenerator.paragraph({ sentences: 2 });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: postTitle,
        post_type: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentContent: string = RandomGenerator.paragraph({ sentences: 5 });
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
  // Verify the comment belongs to the correct post
  TestValidator.equals(
    "comment post ID matches",
    comment.community_platform_post_id,
    post.id,
  );

  // Verify the comment has the correct depth level (1 for top-level comment)
  TestValidator.equals("comment depth level is 1", comment.depth_level, 1);

  // Verify the comment content matches what was submitted
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );

  // Verify the comment author is the authenticated member
  TestValidator.equals(
    "comment author ID matches",
    comment.author_id,
    member.id,
  );

  // Verify the comment status matches the community's comment_review_mode setting
  TestValidator.equals(
    "comment status matches community setting",
    comment.status,
    community.commentReviewMode ? "unreviewed" : "published",
  );
}
