import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_vote_remove(
  connection: api.IConnection,
) {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Vote on a comment (up vote)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const voteUpResponse =
    await api.functional.reddit.member.comments.votes.patchByCommentid(
      memberConnection,
      {
        commentId: commentId,
        body: {
          vote: "up",
        } satisfies IRedditComment.IVote,
      },
    );
  typia.assert(voteUpResponse);
  // 3. Remove the vote
  const removedVoteResponse =
    await api.functional.reddit.member.comments.votes.patchByCommentid(
      memberConnection,
      {
        commentId: commentId,
        body: {
          vote: "remove",
        } satisfies IRedditComment.IVote,
      },
    );
  typia.assert(removedVoteResponse);
  // 4. Verify vote score reverted
  TestValidator.equals(
    "vote score reverted to previous state",
    removedVoteResponse.voteScore,
    voteUpResponse.voteScore - 1,
  );
}
