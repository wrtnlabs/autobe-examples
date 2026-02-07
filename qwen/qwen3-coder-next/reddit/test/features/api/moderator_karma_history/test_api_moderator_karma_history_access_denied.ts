import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaHistory";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
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

export async function test_api_moderator_karma_history_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // Generate random karma history ID for testing
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // Test access denied for regular user (should be forbidden)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {},
  });
  await TestValidator.error(
    "regular user cannot access karma history",
    async () => {
      await api.functional.redditPlatform.moderator.karma_histories.at(
        userConnection,
        {
          historyId: historyId,
        },
      );
    },
  );
  // Test access denied for unauthenticated user (guest)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("guest cannot access karma history", async () => {
    await api.functional.redditPlatform.moderator.karma_histories.at(
      guestConnection,
      {
        historyId: historyId,
      },
    );
  });
}
