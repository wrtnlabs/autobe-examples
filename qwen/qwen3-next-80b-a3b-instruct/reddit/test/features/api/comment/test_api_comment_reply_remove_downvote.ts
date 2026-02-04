import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_comments_replies_create } from "../../../generate/generate_random_community_platform_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_reply_remove_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create a parent comment to serve as container for the reply using generation function
  const parentComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 6,
            wordMax: 12,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // Step 3: Create the reply comment to be voted on using generation function
  const reply =
    await generate_random_community_platform_member_comments_replies_create(
      memberConnection,
      {
        params: {
          commentId: parentComment.id,
        },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(reply);
  // Step 4: Downvote the reply
  const initialVoteResponse =
    await api.functional.communityPlatform.member.comments.replies.votes.upvote(
      memberConnection,
      {
        commentId: parentComment.id,
        replyId: reply.id,
        body: {
          action: "down",
        } satisfies ICommunityPlatformComment.IRequestVote,
      },
    );
  typia.assert(initialVoteResponse);
  TestValidator.equals("initial downvote score", initialVoteResponse.score, 0);
  // Step 5: Remove the downvote from the reply
  const removeVoteResponse =
    await api.functional.communityPlatform.member.comments.replies.votes.upvote(
      memberConnection,
      {
        commentId: parentComment.id,
        replyId: reply.id,
        body: {
          action: "remove",
        } satisfies ICommunityPlatformComment.IRequestVote,
      },
    );
  typia.assert(removeVoteResponse);
  TestValidator.equals(
    "score after removing downvote",
    removeVoteResponse.score,
    1,
  );
  TestValidator.equals(
    "vote status after removal",
    removeVoteResponse.value,
    "remove",
  );
}
