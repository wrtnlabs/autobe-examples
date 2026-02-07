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

export async function test_api_migration_history_create_rollback_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Create migration history record
  const migration =
    await generate_random_community_admin_migration_histories_create(
      adminConnection,
      {
        body: {
          version: "2.0.1",
          patch_name: "rollback_user_avatar_cache",
          status: "rolled_back",
          description:
            "Rolling back cache optimization due to performance regression",
        } satisfies ICommunityMigrationHistory.ICreate,
      },
    );
  typia.assert(migration);
  // 3. Validate migration record
  TestValidator.equals("version matches", migration.version, "2.0.1");
  TestValidator.equals(
    "patch_name matches",
    migration.patch_name,
    "rollback_user_avatar_cache",
  );
  TestValidator.equals(
    "status is rolled_back",
    migration.status,
    "rolled_back",
  );
  TestValidator.equals(
    "description matches",
    migration.description,
    "Rolling back cache optimization due to performance regression",
  );
  TestValidator.predicate(
    "has applied_at timestamp",
    migration.applied_at !== undefined,
  );
  TestValidator.equals(
    "applied_by_id is set",
    migration.applied_by_id !== null,
    true,
  );
}
