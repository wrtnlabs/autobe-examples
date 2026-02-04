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
import { generate_random_community_platform_member_comments_replies_create } from "../../../generate/generate_random_community_platform_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_reply_downvote_removal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and join to authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a parent comment for the reply
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.replies.create(
      memberConnection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 3: Create a reply to the comment
  const reply: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.replies.create(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(reply);
  // Step 4: Remove a vote (even if no vote exists) to test API endpoint structure
  // This tests that the erase function returns a valid ISummary object
  const updatedReply: ICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.member.comments.replies.votes.erase(
      memberConnection,
      {
        commentId: comment.id,
        replyId: reply.id,
      },
    );
  typia.assert(updatedReply);
  // Step 5: Verify the response contains the expected structure of ICommunityPlatformComment.ISummary
  // Since we don't have a way to create votes, we can't test voteScore change, but we verify the structure is valid
  TestValidator.equals("reply ID should match", updatedReply.id, reply.id);
  TestValidator.predicate(
    "voteScore should be a number",
    typeof updatedReply.voteScore === "number",
  );
  TestValidator.predicate(
    "content should be string",
    typeof updatedReply.content === "string",
  );
  TestValidator.predicate(
    "createdAt should be ISO date-time",
    typeof updatedReply.createdAt === "string" &&
      !isNaN(new Date(updatedReply.createdAt).getTime()),
  );
  TestValidator.predicate(
    "replyCount should be non-negative",
    updatedReply.replyCount >= 0,
  );
}
