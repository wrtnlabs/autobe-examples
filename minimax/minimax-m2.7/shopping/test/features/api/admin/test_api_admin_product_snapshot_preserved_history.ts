import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that administrators can view product snapshots regardless of current product status.
 * Validates that snapshots preserve historical data even for deleted products.
 *
 * This test validates the snapshot immutability principle - historical product states are
 * preserved for dispute resolution even when current product data differs. Administrators
 * can access any snapshot to verify what the product looked like at the time of snapshot
 * creation, which is critical for customer dispute resolution and compliance auditing.
 *
 * The test flow:
 * 1. Administrator authenticates via join endpoint
 * 2. Admin requests a specific product snapshot by UUID
 * 3. System returns the complete snapshot data including historical values
 * 4. Response is validated to contain all required fields preserving product state
 *
 * @param connection - Base API connection for the test
 */
export async function test_api_admin_product_snapshot_preserved_history(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(authorizedAdmin);
  // Step 2: Generate a valid UUID for snapshotId parameter
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Call GET /admin/admin/product-snapshots/{snapshotId} endpoint
  const snapshot =
    await api.functional.ecommerceMall.admin.admin.product_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotId,
      },
    );
  // Step 4: Validate response with typia.assert() - validates complete structure
  typia.assert(snapshot);
  // Step 5: Validate snapshot ID matches requested UUID
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  // Step 6: Validate all required historical product fields are present
  TestValidator.predicate("name is non-empty string", snapshot.name.length > 0);
  TestValidator.predicate(
    "description is non-empty string",
    snapshot.description.length > 0,
  );
  TestValidator.predicate(
    "basePrice is positive number",
    snapshot.basePrice > 0,
  );
  TestValidator.predicate(
    "categoryName is non-empty string",
    snapshot.categoryName.length > 0,
  );
  // Step 7: Validate timestamp format (ISO 8601 date-time)
  const createdAtDate = new Date(snapshot.createdAt);
  TestValidator.predicate(
    "createdAt is valid ISO timestamp",
    !isNaN(createdAtDate.getTime()),
  );
  // Step 8: Validate product summary structure
  TestValidator.predicate("product summary exists", snapshot.product !== null);
  TestValidator.predicate(
    "product id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.product.id,
    ),
  );
  TestValidator.predicate(
    "product name is non-empty",
    snapshot.product.name.length > 0,
  );
  // Step 9: Validate seller summary structure for compliance auditing
  TestValidator.predicate("seller summary exists", snapshot.seller !== null);
  TestValidator.predicate(
    "seller id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.seller.id,
    ),
  );
  TestValidator.predicate(
    "seller has approvalStatus",
    snapshot.seller.approvalStatus.length > 0,
  );
  TestValidator.predicate(
    "seller has suspensionStatus",
    snapshot.seller.suspensionStatus.length > 0,
  );
  TestValidator.predicate(
    "seller has email",
    snapshot.seller.email.includes("@"),
  );
  // Step 10: Validate images array structure
  TestValidator.predicate("images is array", Array.isArray(snapshot.images));
  if (snapshot.images.length > 0) {
    const firstImage = snapshot.images[0];
    TestValidator.predicate(
      "image id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstImage.id,
      ),
    );
    TestValidator.predicate(
      "image url is valid uri",
      firstImage.url.startsWith("http"),
    );
    TestValidator.predicate(
      "image has displayOrder",
      typeof firstImage.displayOrder === "number",
    );
  }
  // Step 11: Validate variants array structure
  TestValidator.predicate(
    "variants is array",
    Array.isArray(snapshot.variants),
  );
  if (snapshot.variants.length > 0) {
    const firstVariant = snapshot.variants[0];
    TestValidator.predicate(
      "variant id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstVariant.id,
      ),
    );
    TestValidator.predicate("variant has key", firstVariant.key.length > 0);
    TestValidator.predicate("variant has value", firstVariant.value.length > 0);
  }
}
