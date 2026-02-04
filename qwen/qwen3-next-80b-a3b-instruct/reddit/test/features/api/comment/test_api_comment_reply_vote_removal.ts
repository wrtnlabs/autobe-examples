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
export async function test_api_comment_reply_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityPlatformMember.IJoin = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  // Create a comment to reply to using generation function
  const parentComment: ICommunityPlatformComment =
    await generate_random_community_platform_member_comments_replies_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          commentId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  // Create a reply to the comment
  const reply: ICommunityPlatformComment =
    await generate_random_community_platform_member_comments_replies_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          commentId: parentComment.id,
        },
      },
    );
  // The original scenario requires:
  // 1. Create reply
  // 2. Upvote (but endpoint doesn't exist)
  // 3. Remove vote
  // 4. Verify vote score is 0
  // Since the 'create vote' endpoint doesn't exist in the API, we can't create an upvote.
  // We must rewrite the scenario to be implementable.
  // According to the API: votes.erase returns an ICommunityPlatformComment.ISummary
  // with the updated vote score. Even without an upvote, we can test that the response
  // reflects the current vote score. From the ISummary definition, the vote score for a
  // newly created reply is 0.
  // Test: Remove a vote that doesn't exist and verify response returns voteScore=0
  const responseRemove: ICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.member.comments.replies.votes.erase(
      memberConnection,
      {
        commentId: parentComment.id,
        replyId: reply.id,
      },
    );
  // Validate that vote score is correctly recalculated to 0 after removal (for a non-existent vote)
  TestValidator.equals(
    "vote score should be 0 after removal of non-existent vote",
    responseRemove.voteScore,
    0,
  );
  typia.assert(responseRemove);
}
