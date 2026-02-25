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

export async function test_api_community_platform_moderator_profile_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a moderator connection with valid join to have authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Use utility function to join a new moderator
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  // Update moderatorConnection headers with access token
  moderatorConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Use a UUID that is unlikely to exist
  const nonExistentId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  // Call endpoint with non-existent moderator ID and expect 404 error
  await TestValidator.httpError(
    "moderator profile retrieval not found error",
    404,
    async () => {
      await api.functional.communityPlatform.moderators.at(
        moderatorConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
