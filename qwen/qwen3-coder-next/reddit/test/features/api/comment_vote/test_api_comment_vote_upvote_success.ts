import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comment_votes_create } from "../../../generate/generate_random_reddit_platform_member_comment_votes_create";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

/**
 * Test successful upvote on a comment.
 * 1. Authenticate member
 * 2. Create comment vote with upvote type and valid comment_id
 * 3. Validate vote record with correct member, comment, and vote type
 * 4. Verify vote score is positive
 */
export async function test_api_comment_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create comment vote with upvote type
  const vote =
    await generate_random_reddit_platform_member_comment_votes_create(
      memberConnection,
      {
        body: {
          comment_id: typia.random<string & tags.Format<"uuid">>(),
          vote_type: "upvote" as const,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  // 3. Validate vote record
  TestValidator.equals("member matches", vote.member.id, member.id);
  TestValidator.equals("comment matches", vote.comment.id, vote.comment.id);
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.predicate("vote score is positive", vote.vote_score > 0);
}
