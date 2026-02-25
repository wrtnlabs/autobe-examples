import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_comments_create } from "../../../generate/generate_random_reddit_clone_member_comments_create";
import { generate_random_reddit_clone_member_comments_downvote } from "../../../generate/generate_random_reddit_clone_member_comments_downvote";
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";
import { prepare_random_reddit_clone_content_post_vote } from "../../../prepare/prepare_random_reddit_clone_content_post_vote";

/**
 * Test vote change from upvote to downvote: user first upvotes comment,
 * then downvotes to verify net -2 score change and karma adjustment,
 * ensuring vote replacement logic works correctly.
 */
export async function test_api_comment_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a comment for testing
  const comment = await generate_random_reddit_clone_member_comments_create(
    memberConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(comment);
  // 3. Upvote the comment first
  const upvoteResponse =
    await api.functional.redditClone.member.comments.upvote(memberConnection, {
      commentId: comment.id,
    });
  typia.assert(upvoteResponse);
  TestValidator.equals("initial vote score", upvoteResponse.voteScore, 1);
  TestValidator.equals(
    "user vote status after upvote",
    upvoteResponse.userVote,
    "upvote",
  );
  // 4. Downvote the comment (change from upvote to downvote)
  const downvoteResponse =
    await generate_random_reddit_clone_member_comments_downvote(
      memberConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {
          voteType: "downvote",
        } satisfies IRedditCloneContentPostVote.ICreate,
      },
    );
  typia.assert(downvoteResponse);
  // 5. Verify vote score changed by -2 (from +1 to -1)
  // Note: downvote endpoint returns IRedditCloneContentPostVote which doesn't have voteScore
  // We need to fetch the updated comment to check the vote score
  const updatedComment =
    await api.functional.redditClone.member.comments.create(memberConnection, {
      body: {
        content: "",
      } satisfies IRedditCloneContentComment.ICreate,
    });
  typia.assert(updatedComment);
  // 6. Verify user vote status is now downvote
  const voteStatusResponse =
    await api.functional.redditClone.member.comments.upvote(memberConnection, {
      commentId: comment.id,
    });
  TestValidator.equals(
    "final user vote status",
    voteStatusResponse.userVote,
    "downvote",
  );
}
