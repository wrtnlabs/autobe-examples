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

export async function test_api_migration_history_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // Use the authorized connection directly (headers are set automatically by utility)
  // Generate a valid migrationId that we assume exists in the test system (random UUID)
  const migrationId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve migration history record using the generated migrationId
  const migrationRecord =
    await api.functional.community.admin.migration_histories.at(
      adminConnection, // Use the authorized connection directly
      { migrationId },
    );
  typia.assert(migrationRecord);
  // Validate structure
  TestValidator.equals(
    "migrationId matches request",
    migrationRecord.id,
    migrationId,
  );
  TestValidator.predicate(
    "status is valid",
    migrationRecord.status === "applied" ||
      migrationRecord.status === "failed" ||
      migrationRecord.status === "rolled_back",
  );
}
