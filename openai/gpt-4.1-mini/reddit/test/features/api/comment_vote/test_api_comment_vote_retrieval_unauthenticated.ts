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

export async function test_api_comment_vote_retrieval_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that an unauthenticated user cannot retrieve comment vote details.
  // Generate dummy UUIDs for commentId and voteId as the API requires UUID format.
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  const voteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // Attempt to retrieve the comment vote with the base connection (unauthenticated).
  // Expect an HttpError 401 Unauthorized error.
  await TestValidator.httpError(
    "unauthenticated comment vote retrieval rejected",
    401,
    async () => {
      await api.functional.communityPlatform.user.comments.votes.at(
        connection,
        {
          commentId,
          voteId,
        },
      );
    },
  );
}
