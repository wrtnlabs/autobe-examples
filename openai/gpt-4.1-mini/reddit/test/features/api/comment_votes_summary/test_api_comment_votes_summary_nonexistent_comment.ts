import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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

export async function test_api_comment_votes_summary_nonexistent_comment(
  connection: api.IConnection,
): Promise<void> {
  // Moderator join and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<string & tags.Format<"email">>().split("@")[0],
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(authorizedModerator);
  // Update moderatorConnection headers with access token
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = authorizedModerator.token.access;
  // Attempt to get vote summary for a non-existent commentId
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 on non-existent comment vote summary",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.comments.votes.summary.votesSummary(
        moderatorConnection,
        { commentId: nonExistentCommentId },
      );
    },
  );
}
