import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteOfUserStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUserStat";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comment_vote_stats_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // The test validates authorization enforcement for moderator comment vote stats endpoint.
  // 1. Generate a sample UUID for commentId for testing
  const commentId: string = typia.random<string & typia.tags.Format<"uuid">>();
  // 2. Try to call the vote stats API without any authentication (unauthenticated)
  await TestValidator.httpError(
    "unauthenticated access denied",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.comments.vote_stats.voteStats(
        { host: connection.host },
        { commentId },
      );
    },
  );
  // 3. Create moderator actor and authorize (join) to get auth token
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 4. Now try to call the vote stats API with proper moderator authorization
  const voteStats =
    await api.functional.communityPlatform.moderator.comments.vote_stats.voteStats(
      moderatorConnection,
      { commentId },
    );
  typia.assert(voteStats);
  // 5. Confirm that the voteStats object is not null and valid
  TestValidator.predicate(
    "authorized moderator retrieve vote stats",
    voteStats !== null && voteStats !== undefined,
  );
}
