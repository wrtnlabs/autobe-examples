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

export async function test_api_activity_log_partial_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and get authorized connection
  const adminAuthorized = await authorize_admin_join(
    { host: connection.host },
    { body: {} },
  );
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuthorized.token.access}` },
  };
  // 2. Create initial activity log entry
  const initialActivityLog =
    (await generate_random_community_platform_activity_logs_create(
      adminConnection,
      { body: {} },
    )) as unknown as ICommunityPlatformActivityLog & {
      id: string;
    };
  typia.assert(initialActivityLog);
  // 3. Prepare a partial update body (only updating metadata field) for partial update test
  const partialUpdateBody: Partial<ICommunityPlatformActivityLog.IUpdate> = {
    metadata: {
      testKey: RandomGenerator.alphabets(10),
      testNumber: 42,
    },
  };
  // 4. Perform the partial update by admin
  const updatedActivityLog =
    await api.functional.communityPlatform.activityLogs.update(
      adminConnection,
      {
        id: initialActivityLog.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(updatedActivityLog);
  // 5. Validate that update response is defined and partial update worked
  TestValidator.predicate(
    "partial update response is defined",
    updatedActivityLog !== undefined && updatedActivityLog !== null,
  );
  // 6. Repeat the update to test idempotency
  const repeatedUpdate =
    await api.functional.communityPlatform.activityLogs.update(
      adminConnection,
      {
        id: initialActivityLog.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(repeatedUpdate);
  TestValidator.predicate(
    "repeated update response is defined",
    repeatedUpdate !== undefined && repeatedUpdate !== null,
  );
  // 7. Authorization enforcement test with connection without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update attempt",
    403,
    async () => {
      await api.functional.communityPlatform.activityLogs.update(
        unauthorizedConnection,
        {
          id: initialActivityLog.id,
          body: partialUpdateBody,
        },
      );
    },
  );
}
