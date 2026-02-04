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
export async function test_api_comment_thread_summary(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      },
    });
  typia.assert(member);
  // Step 2: Create a post using the authorized member connection
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          text: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(post);
  // Step 3: Create the target comment directly on the post (only supported operation)
  const targetComment: ICommunityPlatformComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(targetComment);
  // Step 4: Retrieve the thread summary for the target comment
  // Note: The scenario asks for "thread-summary" which implies responsive replies,
  // but the API does not support creating replies to comments.
  // Therefore, the thread-summary will only contain the target comment and no replies.
  const threadSummary: ICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.thread_summary.at(
      memberConnection,
      {
        commentId: targetComment.id,
      },
    );
  typia.assert(threadSummary);
  // Step 5: Validate the thread summary contains the correct comment content
  // Fix: Use typia.assert to cast the summary comment to a type with 'content' property
  // Since we know the comment has content from creation, and summary should have it too
  // But type system says it's not available, so we assert type safely
  TestValidator.equals(
    "comment content matches",
    typia.assert<{content: string}>(threadSummary).content,
    typia.assert<{content: string}>(targetComment).content,
  );
  // Step 6: Validate the creation timestamp is present and in ISO 8601 format
  TestValidator.predicate(
    "creation timestamp is valid",
    threadSummary.createdAt.match(
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/,
    ) !== null,
  );
  // Step 7: Validate the vote score is a number
  TestValidator.predicate(
    "vote score is a number",
    typeof threadSummary.voteScore === "number",
  );
  // Step 8: Validate the reply count is 0 (no child replies since they cannot be created through API)
  TestValidator.equals("reply count is 0", threadSummary.replyCount, 0);
  // Step 9: Because comments cannot be nested, no higher-order ancestry validation is possible
  // The system's thread-summary endpoint will not return parent comments as it only supports flat comments on a post
  // Additional validation based on thread-summary structure is not possible
  // This implementation validates what is API-supported.
} 