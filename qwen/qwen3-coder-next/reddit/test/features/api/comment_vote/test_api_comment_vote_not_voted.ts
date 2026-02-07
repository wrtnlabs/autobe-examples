import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_comment_vote_not_voted(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and authenticates
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userAuth);
  // 2. Get vote status for a non-existent comment (should return null)
  const nonExistentCommentId = "00000000-0000-0000-0000-000000000000";
  const voteResult =
    await api.functional.redditPlatform.user.comments.vote.self.at(
      userConnection,
      {
        commentId: nonExistentCommentId,
      },
    );
  typia.assert(voteResult);
  // 3. Validate that no vote exists (null result)
  TestValidator.equals(
    "vote status is null for non-existent comment",
    voteResult,
    null,
  );
}
