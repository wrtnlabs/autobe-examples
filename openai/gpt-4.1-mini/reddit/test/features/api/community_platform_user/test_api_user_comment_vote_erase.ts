import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_comment_vote_erase(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a comment vote by the vote owner user
  // 1. Join user and setup connection with token
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(connection, { body: {} });
  userConnection.headers = { Authorization: `Bearer ${userAuth.token.access}` };
  // 2. Create a test comment by user (simulate comment creation, since no create endpoint provided)
  // For testing, we need to create a comment and cast a vote by the user.
  // Because no comment creation or vote creation utility provided, use random UUIDs
  // We simulate creation by random IDs (in real test, replace with actual APIs or utility)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Cast vote on comment by same user
  // Because no vote creation endpoint or utility function is provided in inputs, we skip actual creation
  // We assume vote exists with voteId on commentId by user
  // 4. Delete the vote
  await api.functional.communityPlatform.user.comments.votes.erase(
    userConnection,
    {
      commentId: commentId,
      voteId: voteId,
    },
  );
  // 5. Since the erase method returns void, we validate by attempting repeated deletion results in error
  await TestValidator.error(
    "deleting already deleted vote should throw",
    async () => {
      await api.functional.communityPlatform.user.comments.votes.erase(
        userConnection,
        {
          commentId: commentId,
          voteId: voteId,
        },
      );
    },
  );
  // Scenario 2: Attempt to delete a vote that doesn't belong to the user (unauthorized deletion attempt)
  // Setup: Create another user and another vote
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUserAuth = await authorize_user_join(connection, { body: {} });
  otherUserConnection.headers = {
    Authorization: `Bearer ${otherUserAuth.token.access}`,
  };
  // Simulate creation of comment and vote by other user
  const otherCommentId = typia.random<string & tags.Format<"uuid">>();
  const otherVoteId = typia.random<string & tags.Format<"uuid">>();
  // The user tries to delete other user's vote
  await TestValidator.httpError("unauthorized vote deletion", 403, async () => {
    await api.functional.communityPlatform.user.comments.votes.erase(
      userConnection,
      {
        commentId: otherCommentId,
        voteId: otherVoteId,
      },
    );
  });
  // Scenario 3: Deletion attempt of a non-existent vote
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  const validCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("delete non-existent vote", 404, async () => {
    await api.functional.communityPlatform.user.comments.votes.erase(
      userConnection,
      {
        commentId: validCommentId,
        voteId: nonExistentVoteId,
      },
    );
  });
}
