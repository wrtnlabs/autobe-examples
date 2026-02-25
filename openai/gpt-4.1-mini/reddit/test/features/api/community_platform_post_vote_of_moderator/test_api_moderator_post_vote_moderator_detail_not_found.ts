import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Scenario: Retrieve moderator post vote detail with a postVoteId that does not exist in the system.
 * - Prerequisites: Authentication as a moderator.
 * - Steps: Request moderator post vote detail with a made-up UUID that does not exist.
 * - Verify: Receive 404 Not Found response confirming correct handling of nonexistent resource.
 */
export async function test_api_moderator_post_vote_moderator_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and obtain a connection with authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string>(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  // Update moderatorConnection's Authorization header
  moderatorConnection.headers = {
    ...(moderatorConnection.headers ?? {}),
    Authorization: moderatorAuth.token.access,
  };
  // 2. Request moderator post vote detail with non-existent postVoteId
  const nonExistentPostVoteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect an HttpError with status 404 when fetching the detail
  await TestValidator.httpError(
    "moderator post vote detail not found",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.postVotes.moderators.at(
        moderatorConnection,
        { postVoteId: nonExistentPostVoteId },
      );
    },
  );
}
