import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_snapshot_history_as_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Extract admin_id from authenticated response
  const adminId = authResponse.admin_id;
  // Generate random product ID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Call API to retrieve product snapshot history as admin
  const snapshotHistory =
    await api.functional.shoppingMall.admin.products.snapshots.at(
      adminConnection,
      { productId },
    );
  // Validate response structure and types
  typia.assert(snapshotHistory);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    snapshotHistory.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    snapshotHistory.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    snapshotHistory.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    snapshotHistory.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    snapshotHistory.pagination.pages >= 0,
    true,
  );
  // Validate snapshots have correct structure and required fields
  if (snapshotHistory.data.length > 0) {
    const firstSnapshot = snapshotHistory.data[0];
    // Validate each required field in snapshot
    TestValidator.equals(
      "snapshot has version",
      typeof firstSnapshot.version === "number",
      true,
    );
    TestValidator.equals(
      "snapshot has name",
      typeof firstSnapshot.name === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has description",
      typeof firstSnapshot.description === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has base_price",
      typeof firstSnapshot.base_price === "number",
      true,
    );
    TestValidator.equals(
      "snapshot has category_id",
      typeof firstSnapshot.category_id === "string" &&
        firstSnapshot.category_id.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot has changed_at",
      typeof firstSnapshot.changed_at === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has changed_by_id",
      typeof firstSnapshot.changed_by_id === "string" &&
        firstSnapshot.changed_by_id.length > 0,
      true,
    );
    // Validate format of timestamp
    TestValidator.predicate("changed_at is date-time format", () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      return isoRegex.test(firstSnapshot.changed_at);
    });
    // Validate UUID format for category_id
    TestValidator.predicate("category_id is uuid format", () => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(firstSnapshot.category_id);
    });
    // Validate UUID format for changed_by_id
    TestValidator.predicate("changed_by_id is uuid format", () => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(firstSnapshot.changed_by_id);
    });
    // Confirm variants and images are NOT included (as specified)
    TestValidator.equals(
      "snapshot has no variants property",
      "variants" in firstSnapshot,
      false,
    );
    TestValidator.equals(
      "snapshot has no images property",
      "images" in firstSnapshot,
      false,
    );
  }
  // Confirm that the response structure follows the schema definition
  // page.data contains ISnapshot, not the full product entity
  // Only version, name, description, base_price, category_id, changed_at, changed_by_id should be present
  // Validate that at least one snapshot is returned or an empty array is valid
  TestValidator.predicate("data is array", () =>
    Array.isArray(snapshotHistory.data),
  );
  // All assertions must pass - if we reach here, test has passed
}
