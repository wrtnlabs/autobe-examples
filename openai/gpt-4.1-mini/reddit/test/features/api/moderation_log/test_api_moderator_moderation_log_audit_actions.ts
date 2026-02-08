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
import { generate_random_community_platform_moderator_moderation_logs_create_moderation_log } from "../../../generate/generate_random_community_platform_moderator_moderation_logs_create_moderation_log";
import { prepare_random_community_platform_moderation_log } from "../../../prepare/prepare_random_community_platform_moderation_log";

export async function test_api_moderator_moderation_log_audit_actions(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins and obtains authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {}, // IJoin is empty per definition
    },
  );
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // List of action types for moderation logs
  const actionTypes = ["deletion", "ban", "unban", "report_handled"] as const;
  // Create a moderation log for each action type and validate the response structure
  for (const action_type of actionTypes) {
    // Generate a log entry, optionally passing partial data with action_type
    // The generator will prepare valid data internally
    const log =
      await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
        moderatorConnection,
        {
          body: {
            action_type,
          } as Partial<ICommunityPlatformModerationLog.ICreate>,
        },
      );
    typia.assert(log); // Validate the structure of moderation log
  }
  // Validate unauthorized creation returns 401 error
  await TestValidator.httpError(
    "unauthorized creation forbidden",
    401,
    async () => {
      await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
        connection, // base connection without auth headers
        { body: {} },
      );
    },
  );
}
