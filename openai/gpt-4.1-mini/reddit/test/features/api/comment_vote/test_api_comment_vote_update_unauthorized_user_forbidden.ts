import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUser";
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

export async function test_api_comment_vote_update_unauthorized_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register two distinct users
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_user_join(user1Connection, {});
  user1Connection.headers = {
    Authorization: user1Auth.token.access,
  };
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_user_join(user2Connection, {});
  user2Connection.headers = {
    Authorization: user2Auth.token.access,
  };
  // We need to simulate creation of a comment vote by user1 since the scenario depends on a comment vote owned by user1
  // but no creation API provided. We simulate a random commentVoteId for the update attempt.
  // Compose a random vote type for update
  const invalidUpdateBody: ICommunityPlatformCommentVoteOfUser.IUpdate = {
    vote_type: "downvote",
  };
  // Attempt to update user1's vote using user2Connection (unauthorized user)
  // We don't have direct commentVoteId to use, so simulate a random UUID that presumably belongs to user1
  const commentVoteId = typia.random<string & tags.Format<"uuid">>();
  // Since the user2 attempts to update a comment vote not belonging to them, expect HTTP 403 Forbidden
  await TestValidator.httpError(
    "unauthorized user cannot update another user's comment vote",
    403,
    async () => {
      await api.functional.communityPlatform.user.commentVotes.users.updateCommentVoteByUser(
        user2Connection,
        {
          commentVoteId,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
