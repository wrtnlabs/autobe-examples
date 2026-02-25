import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
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
import { prepare_random_reddit_clone_content_comment } from "../../../prepare/prepare_random_reddit_clone_content_comment";

export async function test_api_comment_vote_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await api.functional.redditClone.auth.member.join(
    voterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(voter);
  // Update voter connection with token
  voterConnection.headers = { Authorization: voter.token.access };
  // 2. Create second user (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await api.functional.redditClone.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(author);
  // Update author connection with token
  authorConnection.headers = { Authorization: author.token.access };
  // 3. Create a comment using author
  const comment = await api.functional.redditClone.member.comments.create(
    authorConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneContentComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Upvote the comment by voter
  const upvoteResult1 = await api.functional.redditClone.comments.votes.cast(
    voterConnection,
    {
      commentId: comment.id,
      body: { type: "upvote" } satisfies IRedditCloneContentComment.IVote,
    },
  );
  typia.assert(upvoteResult1);
  TestValidator.equals("upvote score +1", upvoteResult1.voteScore, 1);
  TestValidator.equals("upvote status", upvoteResult1.userVote, "upvote");
  // 5. Verify comment score increased
  const refreshedComment1 =
    await api.functional.redditClone.member.comments.create(authorConnection, {
      body: {
        postId: undefined,
        parentId: undefined,
        content: "dummy",
      } satisfies IRedditCloneContentComment.ICreate,
    });
  typia.assert(refreshedComment1);
  TestValidator.equals(
    "comment score after upvote",
    refreshedComment1.voteScore,
    1,
  );
  // 6. Remove upvote (toggle behavior)
  const neutralResult = await api.functional.redditClone.comments.votes.cast(
    voterConnection,
    {
      commentId: comment.id,
      body: { type: "upvote" } satisfies IRedditCloneContentComment.IVote,
    },
  );
  typia.assert(neutralResult);
  TestValidator.equals(
    "neutral score after removing upvote",
    neutralResult.voteScore,
    0,
  );
  TestValidator.equals("neutral status", neutralResult.userVote, "none");
  // 7. Downvote the comment
  const downvoteResult = await api.functional.redditClone.comments.votes.cast(
    voterConnection,
    {
      commentId: comment.id,
      body: { type: "downvote" } satisfies IRedditCloneContentComment.IVote,
    },
  );
  typia.assert(downvoteResult);
  TestValidator.equals("downvote score -1", downvoteResult.voteScore, -1);
  TestValidator.equals("downvote status", downvoteResult.userVote, "downvote");
  // 8. Verify comment score decreased
  const refreshedComment2 =
    await api.functional.redditClone.member.comments.create(authorConnection, {
      body: {
        postId: undefined,
        parentId: undefined,
        content: "dummy",
      } satisfies IRedditCloneContentComment.ICreate,
    });
  typia.assert(refreshedComment2);
  TestValidator.equals(
    "comment score after downvote",
    refreshedComment2.voteScore,
    -1,
  );
  // 9. Remove downvote
  const restoreResult = await api.functional.redditClone.comments.votes.cast(
    voterConnection,
    {
      commentId: comment.id,
      body: { type: "downvote" } satisfies IRedditCloneContentComment.IVote,
    },
  );
  typia.assert(restoreResult);
  TestValidator.equals(
    "restored score after removing downvote",
    restoreResult.voteScore,
    0,
  );
  TestValidator.equals("restored status", restoreResult.userVote, "none");
  // 10. Change vote from downvote to upvote (net +2)
  await api.functional.redditClone.comments.votes.cast(voterConnection, {
    commentId: comment.id,
    body: { type: "downvote" } satisfies IRedditCloneContentComment.IVote,
  });
  const changedVoteResult =
    await api.functional.redditClone.comments.votes.cast(voterConnection, {
      commentId: comment.id,
      body: { type: "upvote" } satisfies IRedditCloneContentComment.IVote,
    });
  typia.assert(changedVoteResult);
  TestValidator.equals(
    "vote change score (+2 from -1)",
    changedVoteResult.voteScore,
    1,
  );
  TestValidator.equals(
    "changed vote status",
    changedVoteResult.userVote,
    "upvote",
  );
}
