import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_retrieval_with_post_context(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate the member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // Step 2: Create a post using the authenticated member connection
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        text: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 8,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 3: Create a comment on the post using the authenticated member connection
  const commentContent = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: commentContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 4: Retrieve the comment with post context using the correct API method
  const retrievedComment: ICommunityPlatformComment.IInvert =
    await api.functional.communityPlatform.member.posts.comments.at(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  // Step 5: Validate that the retrieved comment contains the correct post context
  // Validatable properties only (due to empty summary interfaces)
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  // Validate comment content matches using the original content we provided
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    commentContent,
  );
  // Validate comment score matches initial value
  TestValidator.equals("comment initial score is 0", retrievedComment.score, 0);
  // Validate community context - ICommunityPlatformCommunity.ISummary has name, description, icon, subscriber_count, created_at
  TestValidator.equals(
    "community name matches",
    retrievedComment.community.name,
    post.community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedComment.community.description,
    post.community.description,
  );
  TestValidator.equals(
    "community icon matches",
    retrievedComment.community.icon,
    post.community.icon,
  );
  TestValidator.equals(
    "community subscriber count matches",
    retrievedComment.community.subscriber_count,
    post.community.subscriber_count,
  );
  TestValidator.equals(
    "community created at matches",
    retrievedComment.community.created_at,
    post.community.created_at,
  );
}
