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

export async function test_api_comment_vote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two members: voter and comment author
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Author creates a comment using utility function
  const comment = await generate_random_reddit_clone_member_comments_create(
    authorConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 3. Voter downvotes the comment (initial vote)
  const downvoteResult = await api.functional.redditClone.comments.votes.cast(
    voterConnection,
    {
      commentId: comment.id,
      body: { type: "downvote" } satisfies IRedditCloneContentComment.IVote,
    },
  );
  typia.assert(downvoteResult);
  TestValidator.equals(
    "downvote score",
    downvoteResult.voteScore,
    comment.voteScore - 1,
  );
  TestValidator.equals(
    "downvote userVote",
    downvoteResult.userVote,
    "downvote",
  );
  // 4. Voter changes vote to upvote (vote replacement)
  const upvoteResult = await api.functional.redditClone.comments.votes.cast(
    voterConnection,
    {
      commentId: comment.id,
      body: { type: "upvote" } satisfies IRedditCloneContentComment.IVote,
    },
  );
  typia.assert(upvoteResult);
  // 5. Verify net score change: from -1 to +1 (net change of +2)
  // Original: comment.voteScore
  // After downvote: comment.voteScore - 1
  // After upvote: comment.voteScore - 1 + 2 = comment.voteScore + 1
  TestValidator.equals(
    "upvote score",
    upvoteResult.voteScore,
    comment.voteScore + 1,
  );
  TestValidator.equals("upvote userVote", upvoteResult.userVote, "upvote");
}
