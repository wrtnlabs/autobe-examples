import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMigrationHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMigrationHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_migration_history_filter_by_status_and_patch_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Perform test filter operation
  const filterBody: ICommunityMigrationHistory.IRequest = {
    status: ["failed"],
    patch_name: "database-schema-update", // partial substring match
  };
  const result = await api.functional.community.admin.migration_histories.index(
    adminConnection,
    {
      body: filterBody,
    },
  );
  typia.assert(result);
  // 3. Validation
  // Validate response includes only records with status = 'failed'
  TestValidator.predicate("all records have status 'failed'", () =>
    result.data.every((item) => (item as any).status === "failed"),
  );
  // Validate response includes only records where patch_name.contains('database-schema-update')
  TestValidator.predicate(
    "all records have patch_name containing 'database-schema-update'",
    () =>
      result.data.every((item) =>
        (item as any).patch_name.includes("database-schema-update"),
      ),
  );
  // Validate results are sorted by applied_at DESC (assuming backend implementation)
  TestValidator.predicate("records sorted by applied_at DESC", () => {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date((result.data[i] as any).applied_at);
      const next = new Date((result.data[i + 1] as any).applied_at);
      if (current < next) {
        return false; // not sorted DESC
      }
    }
    return true;
  });
  // Validate all required summary fields are present in each item
  TestValidator.predicate("all records have required summary fields", () =>
    result.data.every(
      (item) =>
        (item as any).id !== undefined &&
        (item as any).applied_by_id !== undefined &&
        (item as any).version !== undefined &&
        (item as any).patch_name !== undefined &&
        (item as any).status !== undefined &&
        (item as any).applied_at !== undefined,
    ),
  );
  // Validate pagination metadata accurately reflects filtered record count
  TestValidator.predicate(
    "pagination records count > 0",
    () => result.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
}