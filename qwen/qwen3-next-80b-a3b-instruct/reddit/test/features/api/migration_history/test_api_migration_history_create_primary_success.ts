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

export async function test_api_migration_history_create_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: Join as admin to obtain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Create migration history record using the authorized admin connection
  const migration =
    await api.functional.community.admin.migration_histories.create(
      adminConnection,
      {
        body: {
          version: "1.2.3",
          patch_name: "add_post_view_stats_table",
          status: "applied",
          description: "Initial migration to support post view tracking",
        } satisfies ICommunityMigrationHistory.ICreate,
      },
    );
  typia.assert(migration);
  // 3. Validate response: All provided fields unchanged (business logic)
  TestValidator.equals("version matches", migration.version, "1.2.3");
  TestValidator.equals(
    "patch_name matches",
    migration.patch_name,
    "add_post_view_stats_table",
  );
  TestValidator.equals("status matches", migration.status, "applied");
  TestValidator.equals(
    "description matches",
    migration.description,
    "Initial migration to support post view tracking",
  );
}
