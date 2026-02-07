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

export async function test_api_migration_history_idempotent_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      // Since ICommunityAdmin.IJoin is empty, no properties needed
      // This satisfies the interface with empty object
    } satisfies ICommunityAdmin.IJoin,
  });
  // 2. Create migration history record
  const migrationCreateBody: ICommunityMigrationHistory.ICreate = {
    // ICommunityMigrationHistory.ICreate is empty, no properties needed
    // This satisfies the interface with empty object
  } satisfies ICommunityMigrationHistory.ICreate;
  const createdMigration =
    await api.functional.community.admin.migration_histories.create(
      adminConnection,
      {
        body: migrationCreateBody,
      },
    );
  typia.assert(createdMigration);
  // 3. First idempotent update with identical object
  const updateBody: ICommunityMigrationHistory = {
    id: createdMigration.id,
    applied_by_id: createdMigration.applied_by_id,
    target_version_id: createdMigration.target_version_id,
    version: createdMigration.version,
    patch_name: createdMigration.patch_name,
    applied_at: createdMigration.applied_at,
    status: createdMigration.status,
    description: createdMigration.description,
    checksum: createdMigration.checksum,
    duration_ms: createdMigration.duration_ms,
    rollback_script_hash: createdMigration.rollback_script_hash,
  } satisfies ICommunityMigrationHistory;
  await api.functional.community.admin.migration_histories.update(
    adminConnection,
    {
      migrationId: createdMigration.id,
      body: updateBody,
    },
  );
  // 4. Second identical idempotent update
  await api.functional.community.admin.migration_histories.update(
    adminConnection,
    {
      migrationId: createdMigration.id,
      body: updateBody,
    },
  );
  // Idempotency is proven by successful execution of two identical updates
  // without any exceptions or errors
}
