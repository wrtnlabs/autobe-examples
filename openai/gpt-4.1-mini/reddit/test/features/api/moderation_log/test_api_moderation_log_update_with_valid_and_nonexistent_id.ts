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

export async function test_api_moderation_log_update_with_valid_and_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins the platform
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {}, // ICommunityPlatformModerator.IJoin is empty type
    });
  // Update connection headers with obtained token
  moderatorConnection.headers = {
    ...moderatorConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Create a moderation log entry to update
  const log =
    await generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(log);
  // Store immutable fields for later comparison
  const immutableId = (log as any).id;
  const immutableCreatedAt =
    (log as any).created_at || (log as any).createdAt || null;
  const immutableUpdatedAt =
    (log as any).updated_at || (log as any).updatedAt || null;
  // 3. Update the moderation log's mutable fields
  const newActionType = "updated_action_type";
  const newActionDetails = "Updated details for moderation log entry.";
  const updateBody: ICommunityPlatformModerationLog.IUpdate = {
    action_type: newActionType,
    action_details: newActionDetails,
  };
  const updatedLog =
    await api.functional.communityPlatform.moderator.moderation_logs.update(
      moderatorConnection,
      {
        moderationLogId: (log as any).id,
        body: updateBody,
      },
    );
  typia.assert(updatedLog);
  // Validate updated fields
  TestValidator.equals(
    "action_type updated",
    (updatedLog as any).action_type,
    newActionType,
  );
  TestValidator.equals(
    "action_details updated",
    (updatedLog as any).action_details,
    newActionDetails,
  );
  // Validate immutable fields unchanged
  TestValidator.equals("id unchanged", (updatedLog as any).id, immutableId);
  if (immutableCreatedAt !== null) {
    TestValidator.equals(
      "created_at unchanged",
      (updatedLog as any).created_at || (updatedLog as any).createdAt || null,
      immutableCreatedAt,
    );
  }
  if (immutableUpdatedAt !== null) {
    TestValidator.equals(
      "updated_at unchanged",
      (updatedLog as any).updated_at || (updatedLog as any).updatedAt || null,
      immutableUpdatedAt,
    );
  }
  // 4. Attempt update with non-existent moderationLogId
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update fails for non-existent moderationLogId",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.moderation_logs.update(
        moderatorConnection,
        {
          moderationLogId: nonexistentId,
          body: updateBody,
        },
      );
    },
  );
}
