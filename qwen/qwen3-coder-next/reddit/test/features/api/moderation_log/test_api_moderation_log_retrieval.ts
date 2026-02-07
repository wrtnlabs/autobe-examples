import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationLog";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 1: Register moderator account
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorAuthorized);
  // Create new connection with moderator token
  const moderatorAuthConnection: api.IConnection = {
    host: moderatorConnection.host,
    headers: moderatorConnection.headers,
  };
  // Step 2: Retrieve a specific moderation log
  const moderationLog =
    await api.functional.redditPlatform.moderator.moderation_logs.at(
      moderatorAuthConnection,
      {
        logId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(moderationLog);
  // Step 3: Validate the retrieved moderation log structure
  // Since IRedditPlatformModerationLog is an empty object, validate basic properties
  TestValidator.predicate(
    "log is an object",
    moderationLog !== null && typeof moderationLog === "object",
  );
}
