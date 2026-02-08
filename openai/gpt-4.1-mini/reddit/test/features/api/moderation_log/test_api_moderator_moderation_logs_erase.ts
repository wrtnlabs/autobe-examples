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

export async function test_api_moderator_moderation_logs_erase(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully delete an existing moderation log
  {
    const moderatorConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_moderator_join(moderatorConnection, {
      body: {},
    });
    // authorize_moderator_join sets the Authorization header internally
    const moderationLogId = typia.random<string & tags.Format<"uuid">>();
    // Erase should succeed and return void
    await api.functional.communityPlatform.moderator.moderation_logs.erase(
      moderatorConnection,
      {
        moderationLogId,
      },
    );
  }
  // Scenario 2: Delete non-existent moderation log
  {
    const moderatorConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_moderator_join(moderatorConnection, {
      body: {},
    });
    // authorize_moderator_join sets the Authorization header internally
    const nonExistentId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "delete non-existent moderation log",
      404,
      async () => {
        await api.functional.communityPlatform.moderator.moderation_logs.erase(
          moderatorConnection,
          {
            moderationLogId: nonExistentId,
          },
        );
      },
    );
  }
  // Scenario 3: Unauthorized delete attempt
  {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    const randomId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "unauthorized delete attempt",
      [401, 403],
      async () => {
        await api.functional.communityPlatform.moderator.moderation_logs.erase(
          unauthorizedConnection,
          {
            moderationLogId: randomId,
          },
        );
      },
    );
  }
}
