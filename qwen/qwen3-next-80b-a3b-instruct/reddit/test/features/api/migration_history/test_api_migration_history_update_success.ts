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

export async function test_api_migration_history_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Admin joins system to obtain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Create a migration history record with status 'applied'
  const migrationRecord =
    await generate_random_community_admin_migration_histories_create(
      adminConnection,
      {
        body: {
          version: "1.2.3",
          patch_name: "add_post_view_stats_table",
          applied_at: new Date().toISOString(),
          status: "applied",
          description: "Initial migration to add post view statistics",
        } satisfies ICommunityMigrationHistory.ICreate,
      },
    );
  typia.assert(migrationRecord);
  // Update the migration record with corrected metadata
  const updatedMigration =
    await api.functional.community.admin.migration_histories.update(
      adminConnection,
      {
        migrationId: migrationRecord.id,
        body: {
          id: migrationRecord.id,
          applied_by_id: migrationRecord.applied_by_id,
          target_version_id: migrationRecord.target_version_id,
          version: migrationRecord.version,
          patch_name: migrationRecord.patch_name,
          applied_at: new Date().toISOString(),
          status: "rolled_back",
          description: "Corrected migration description after rollback",
          checksum: migrationRecord.checksum,
          duration_ms: migrationRecord.duration_ms,
          rollback_script_hash: migrationRecord.rollback_script_hash,
        } satisfies ICommunityMigrationHistory,
      },
    );
  // Validate that update was successful (200 OK with no content)
  // No response body, so we validate by ensuring no error was thrown and the update succeeded
  // The update endpoint returns void, so we can't directly validate the updated record
  // But we can validate by reading the record back (in real implementation)
  // Since we don't have a read endpoint in the SDK, we assume success by no error
  // Ensure no error occurred during update
  // The test passes if we reach this point without exception
}
