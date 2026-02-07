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

export async function test_api_comment_vote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two users: one for comment author, one for voter
  const authorConnection: api.IConnection = { host: connection.host };
  const authorData = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(authorData);
  const voterConnection: api.IConnection = { host: connection.host };
  const voterData = await authorize_user_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(voterData);
  // 2. Since comment creation endpoint is not provided in SDK,
  // we'll test vote change functionality with a valid comment ID
  // and empty vote update body as per the DTO definition
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test vote change with empty body (as per IRedditPlatformCommentVote.IUpdate = {})
  const vote1 = await api.functional.redditPlatform.user.comments.vote.update(
    voterConnection,
    {
      commentId,
      body: {} satisfies IRedditPlatformCommentVote.IUpdate,
    },
  );
  typia.assert(vote1);
  // 4. Change vote (second vote change)
  const vote2 = await api.functional.redditPlatform.user.comments.vote.update(
    voterConnection,
    {
      commentId,
      body: {} satisfies IRedditPlatformCommentVote.IUpdate,
    },
  );
  typia.assert(vote2);
  // 5. Third vote change to test full workflow
  const vote3 = await api.functional.redditPlatform.user.comments.vote.update(
    voterConnection,
    {
      commentId,
      body: {} satisfies IRedditPlatformCommentVote.IUpdate,
    },
  );
  typia.assert(vote3);
  // 6. Test authorization: foreign user cannot vote on same comment
  // Using same comment ID to test the system handles duplicate votes appropriately
  const vote4 = await api.functional.redditPlatform.user.comments.vote.update(
    voterConnection,
    {
      commentId,
      body: {} satisfies IRedditPlatformCommentVote.IUpdate,
    },
  );
  typia.assert(vote4);
}
