import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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

export async function test_api_comment_vote_retrieval_authorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving detailed vote information for a specific comment vote by an authenticated user
  // 1. User joins (authenticates) to obtain authorization
  const userConnection: api.IConnection = { host: connection.host };
  const auth: ICommunityPlatformUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {}, // ICommunityPlatformUser.IJoin is empty
    },
  );
  // Set authorization header with access token
  userConnection.headers = { Authorization: auth.token.access };
  // 2. Generate valid UUIDs for commentId and voteId
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve vote information using authorized user connection
  const vote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.user.comments.votes.at(
      userConnection,
      {
        commentId,
        voteId,
      },
    );
  typia.assert(vote);
  // 4. Assertions for vote details (business logic properties unknown, so just assert existence)
  // Since ICommunityPlatformCommentVote has no properties defined, only assert response validity
  // 5. Test 404 Not Found edge cases with non-existent IDs
  await TestValidator.httpError(
    "comment vote not found (non-existent voteId)",
    404,
    async () => {
      await api.functional.communityPlatform.user.comments.votes.at(
        userConnection,
        {
          commentId,
          voteId: "00000000-0000-0000-0000-000000000000", // non-existent voteId
        },
      );
    },
  );
  await TestValidator.httpError(
    "comment vote not found (non-existent commentId)",
    404,
    async () => {
      await api.functional.communityPlatform.user.comments.votes.at(
        userConnection,
        {
          commentId: "00000000-0000-0000-0000-000000000000", // non-existent commentId
          voteId,
        },
      );
    },
  );
}
