import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_activity_logs_create } from "../../../generate/generate_random_community_platform_activity_logs_create";
import { prepare_random_community_platform_activity_log } from "../../../prepare/prepare_random_community_platform_activity_log";

export async function test_api_activity_log_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminAuth = await authorize_admin_join(
    { host: connection.host },
    { body: {} satisfies ICommunityPlatformAdmin.IJoin },
  );
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuth.token.access}` },
  };
  // 2. Create initial activity log entry using utility function
  const initialActivityLog =
    await generate_random_community_platform_activity_logs_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(initialActivityLog);
  // Cast to include 'id' property using IEntity (non generic)
  const initialActivityLogWithId =
    initialActivityLog as ICommunityPlatformActivityLog & IEntity;
  // 3. Prepare update body with mutable fields changed
  const newActionType = RandomGenerator.alphabets(10);
  const newIpAddress = `${randint(1, 255)}.${randint(0, 255)}.${randint(0, 255)}.${randint(0, 255)}`;
  const newUserAgent = `Mozilla/5.0 (${RandomGenerator.name()}; rv:78.0) Gecko/20100101 Firefox/78.0`;
  const newMetadata = {
    updated: true,
    info: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updateBody: ICommunityPlatformActivityLog.IUpdate = {
    action_type: newActionType,
    ip_address: newIpAddress,
    user_agent: newUserAgent,
    metadata: newMetadata,
  };
  // 4. Update the activity log entry
  const updatedActivityLog =
    await api.functional.communityPlatform.activityLogs.update(
      adminConnection,
      {
        id: initialActivityLogWithId.id,
        body: updateBody,
      },
    );
  typia.assert(updatedActivityLog);
  const updatedActivityLogWithId =
    updatedActivityLog as ICommunityPlatformActivityLog & IEntity;
  // 5. Verify that id remains the same
  TestValidator.equals(
    "id remains same",
    initialActivityLogWithId.id,
    updatedActivityLogWithId.id,
  );
  // 6. Repeat update with same data to test idempotency
  const idempotentUpdate =
    await api.functional.communityPlatform.activityLogs.update(
      adminConnection,
      {
        id: initialActivityLogWithId.id,
        body: updateBody,
      },
    );
  typia.assert(idempotentUpdate);
  // 7. Create non-admin connection and attempt forbidden update (expect 403 error)
  const nonAdminConnection: api.IConnection = { host: connection.host };
  nonAdminConnection.headers = { Authorization: `Bearer invalid_or_no_token` };
  await TestValidator.httpError("non-admin update forbidden", 403, async () => {
    await api.functional.communityPlatform.activityLogs.update(
      nonAdminConnection,
      {
        id: initialActivityLogWithId.id,
        body: updateBody,
      },
    );
  });
}
