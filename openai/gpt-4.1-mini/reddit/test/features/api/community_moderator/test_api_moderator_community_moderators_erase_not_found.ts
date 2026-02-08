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

export async function test_api_moderator_community_moderators_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // 2. Attempt to delete a moderator assignment using a valid but non-existing communityModeratorId UUID
  const invalidCommunityModeratorId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Expect HTTP 404 Not Found with proper error message
  await TestValidator.httpError(
    "deleting non-existing community moderator assignment returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.erase(
        moderatorConnection,
        {
          communityModeratorId: invalidCommunityModeratorId,
        },
      );
    },
  );
}
