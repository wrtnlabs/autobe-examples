import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_moderator_comment_votes_delete_unauthorized_failure(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates that attempting to delete a comment vote by an unauthorized user (non-moderator) fails with an authorization error.
  // Prepare a moderator connection by joining a new moderator
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<string>(),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  // Create a connection for unauthorized user (normal connection without moderator token)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Use a random UUID for commentVoteId to attempt deletion
  const commentVoteId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the comment vote using unauthorized connection and expect authorization error
  await TestValidator.httpError(
    "deleting comment vote by unauthorized user should fail with authorization error",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.commentVotes.moderators.erase(
        unauthorizedConnection,
        { commentVoteId },
      );
    },
  );
}
