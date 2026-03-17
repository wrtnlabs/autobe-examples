import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_snapshot_historical_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create new connection with admin token for category snapshot operations
  const adminApiConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. Generate category ID and snapshot ID for retrieval
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve snapshot via API endpoint
  // This will return a snapshot record containing historical category state
  const retrievedSnapshot: IEcommerceMallCategorySnapshot =
    await api.functional.ecommerceMall.admin.categories.snapshots.at(
      adminApiConnection,
      {
        categoryId: categoryId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(retrievedSnapshot);
  // 4. Validate snapshot has valid id field
  TestValidator.predicate("snapshot id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedSnapshot.id,
    ),
  );
  // 5. Validate snapshot has valid snapshot_id field
  TestValidator.predicate("snapshot snapshot_id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedSnapshot.snapshot_id,
    ),
  );
  // 6. Validate snapshot has name field with historical data
  TestValidator.predicate(
    "snapshot name is non-empty string",
    () => retrievedSnapshot.name.length > 0,
  );
  // 7. Validate snapshot has description field (can be null)
  TestValidator.predicate(
    "snapshot description is string or null",
    () =>
      typeof retrievedSnapshot.description === "string" ||
      retrievedSnapshot.description === null,
  );
  // 8. Validate snapshot has slug field
  TestValidator.predicate(
    "snapshot slug is non-empty string",
    () => retrievedSnapshot.slug.length > 0,
  );
  // 9. Validate snapshot has code field
  TestValidator.predicate(
    "snapshot code is non-empty string",
    () => retrievedSnapshot.code.length > 0,
  );
  // 10. Validate snapshot has valid parent_id (null or UUID)
  TestValidator.predicate(
    "snapshot parent_id is valid format",
    () =>
      retrievedSnapshot.parent_id === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        retrievedSnapshot.parent_id!,
      ),
  );
  // 11. Validate snapshot has valid level field
  TestValidator.predicate(
    "snapshot level is positive integer",
    () => retrievedSnapshot.level > 0,
  );
  // 12. Validate snapshot has valid sort_order field
  TestValidator.predicate(
    "snapshot sort_order is non-negative integer",
    () => retrievedSnapshot.sort_order >= 0,
  );
  // 13. Validate snapshot has valid is_active field
  TestValidator.predicate(
    "snapshot is_active is boolean",
    () => typeof retrievedSnapshot.is_active === "boolean",
  );
  // 14. Validate snapshot has valid created_at timestamp
  TestValidator.predicate(
    "snapshot created_at is valid date-time",
    () => !isNaN(Date.parse(retrievedSnapshot.created_at)),
  );
  // 15. Validate category reference within snapshot
  TestValidator.predicate("snapshot category has valid id", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedSnapshot.category.id,
    ),
  );
  // 16. Validate category reference has name field
  TestValidator.predicate(
    "snapshot category name is non-empty",
    () => retrievedSnapshot.category.name.length > 0,
  );
  // 17. Validate category reference has slug field
  TestValidator.predicate(
    "snapshot category slug is non-empty",
    () => retrievedSnapshot.category.slug.length > 0,
  );
  // 18. Verify snapshot_id in snapshot data matches the ID used for retrieval
  TestValidator.equals(
    "snapshot data contains correct snapshot_id reference",
    retrievedSnapshot.snapshot_id,
    snapshotId,
  );
}