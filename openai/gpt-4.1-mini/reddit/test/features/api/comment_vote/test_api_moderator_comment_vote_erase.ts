import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_moderator_comment_vote_erase(
  connection: api.IConnection,
) {
  // Create moderator user and authorize
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorAuth);
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {},
  });
  // Create normal user and authorize
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(userAuth);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {},
  });
  // Simulate commentId and voteId as UUIDs
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // Moderator deletes the vote
  await api.functional.communityPlatform.user.comments.votes.erase(
    moderatorConnection,
    {
      commentId,
      voteId,
    },
  );
}
