import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMigrationHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_migration_histories_create } from "../../../generate/generate_random_community_admin_migration_histories_create";
import { prepare_random_community_migration_history } from "../../../prepare/prepare_random_community_migration_history";

export async function test_api_migration_history_status_correction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Create migration record with status 'failed'
  // ICommunityMigrationHistory.ICreate is an empty object - no properties required
  const migrationRecord =
    await generate_random_community_admin_migration_histories_create(
      adminConnection,
      { body: {} }, // empty body is correct for ICreate
    );
  typia.assert(migrationRecord);
  const migrationId = migrationRecord.id;
  // 3. Update migration record status to 'rolled_back' with remediation description
  // Create updated body: use all existing fields from migrationRecord, modify status and description
  await api.functional.community.admin.migration_histories.update(
    adminConnection,
    {
      migrationId,
      body: {
        ...migrationRecord,
        status: "rolled_back", // Corrected status
        description:
          migrationRecord.description +
          "\n\nREMEDIAL ACTION: Rollback completed successfully on " +
          new Date().toISOString(),
      } satisfies ICommunityMigrationHistory,
    },
  );
}
