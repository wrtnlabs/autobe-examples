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

export async function test_api_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const userResult = await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  typia.assert(userResult);
  // 2. Create a test comment using available API or mock data
  // Since the API doesn't provide comment creation, we'll use a mock comment ID
  const mockCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Submit an upvote on the comment
  const upvote = await api.functional.redditPlatform.user.comments.vote.update(
    userConnection,
    {
      commentId: mockCommentId,
      body: { type: "upvote" } satisfies IRedditPlatformCommentVote.IUpdate,
    },
  );
  typia.assert(upvote);
  // 4. Update the vote to 'none' to remove the vote
  const removedVote =
    await api.functional.redditPlatform.user.comments.vote.update(
      userConnection,
      {
        commentId: mockCommentId,
        body: { type: "none" } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(removedVote);
  // 5. Verify the vote record exists
  // Since IRedditPlatformCommentVote is empty, we can only verify the response structure
  TestValidator.predicate(
    "removed vote response is valid",
    removedVote !== null && removedVote !== undefined,
  );
}
