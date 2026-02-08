import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
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

export async function test_api_moderation_logs_not_found_for_invalid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(authorized);
  moderatorConnection.headers = {
    ...(moderatorConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare a non-existent moderationLogId (random UUID)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve moderation log by invalid ID and expect 404 error
  await TestValidator.httpError(
    "moderation log not found for invalid ID",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.moderation_logs.at(
        moderatorConnection,
        { moderationLogId: nonExistentId },
      );
    },
  );
}
