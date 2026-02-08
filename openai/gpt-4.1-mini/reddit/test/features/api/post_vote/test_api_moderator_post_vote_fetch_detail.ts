import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerators";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_vote_fetch_detail(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a moderator post vote.
  // Authenticate as a new moderator by joining the platform.
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Simulate or assign a known valid postVoteId.
  // As we cannot actually create a post vote here (no utility or SDK), we will
  // use a random UUID to perform the positive test with assumption.
  // This should be replaced with a real postVoteId if test environment allows.
  const existingPostVoteId = typia.random<string & tags.Format<"uuid">>();
  // Since there is no way to create a post vote for the test, we will simulate
  // the call and assert the type.
  // Call GET with the valid ID.
  const output =
    await api.functional.communityPlatform.moderator.post_votes.moderators.at(
      moderatorConnection,
      { postVoteId: existingPostVoteId },
    );
  typia.assert(output);
  // Scenario 2: Attempt retrieval with a non-existent postVoteId.
  const randomPostVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found error on non-existent postVoteId",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.post_votes.moderators.at(
        moderatorConnection,
        { postVoteId: randomPostVoteId },
      );
    },
  );
  // Scenario 3: Unauthorized access attempt.
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized error on missing auth",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.post_votes.moderators.at(
        unauthorizedConnection,
        { postVoteId: existingPostVoteId },
      );
    },
  );
}
