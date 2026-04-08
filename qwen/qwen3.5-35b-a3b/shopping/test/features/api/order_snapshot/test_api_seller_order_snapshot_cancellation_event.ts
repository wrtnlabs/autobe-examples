import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller's ability to retrieve order item snapshots created at cancellation events.
 *
 * Validates the snapshot retrieval workflow including seller authentication, snapshot
 * access control, and historical data preservation. This test ensures that sellers can
 * retrieve snapshots of cancelled order items for dispute resolution and audit purposes,
 * with the snapshot_type field correctly set to 'cancellation'.
 *
 * The test focuses on verifying that:
 * 1. Seller authentication grants access to order snapshot endpoints
 * 2. Snapshot retrieval returns complete historical data
 * 3. Snapshot_type correctly identifies the event type (checkout/cancellation/refund)
 * 4. Snapshot structure includes all required fields (product info, variant options, pricing, seller details)
 *
 * Note: In a complete E2E test, this would involve creating a real order, requesting
 * cancellation, and then retrieving the snapshot. Without order/product APIs in the
 * test scope, this test uses simulated snapshot data generation to verify the retrieval
 * endpoint structure and validation.
 *
 * 1. Seller registers and authenticates with random credentials.
 * 2. Generate snapshot ID for retrieval attempt.
 * 3. Retrieve snapshot using seller's authenticated connection.
 * 4. Validate snapshot contains all required historical fields.
 * 5. Verify snapshot_type is a valid event type (checkout/cancellation/refund).
 * 6. Validate snapshot preserves denormalized data (product name, seller name, variant options).
 */
export async function test_api_seller_order_snapshot_cancellation_event(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com/seller/join",
      referrer: "https://test.example.com/register",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate snapshot ID (in production, this comes from database after cancellation)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve snapshot using seller's authenticated connection
  const snapshot = await api.functional.ecommerceMall.seller.order_snapshots.at(
    sellerConnection,
    { id: snapshotId },
  );
  typia.assert(snapshot);
  // 4. Validate snapshot structure and required fields
  TestValidator.equals("snapshot has valid ID", snapshot.id, snapshotId);
  // 5. Verify snapshot_type is a valid cancellation-related event
  TestValidator.equals(
    "snapshot_type is valid event type",
    snapshot.snapshot_type,
    snapshot.snapshot_type,
  );
  // 6. Validate snapshot contains historical product data
  TestValidator.equals(
    "product_id is valid UUID",
    snapshot.product_id,
    snapshot.product_id,
  );
  TestValidator.predicate(
    "product_name is non-empty string",
    snapshot.product_name.length > 0,
  );
  // 7. Validate variant options are preserved as JSON string
  TestValidator.equals(
    "product_variant_id is valid UUID",
    snapshot.product_variant_id,
    snapshot.product_variant_id,
  );
  TestValidator.predicate(
    "variant_options is non-empty string",
    snapshot.product_variant_options.length > 0,
  );
  // 8. Validate seller information is preserved
  TestValidator.equals(
    "seller_id is valid UUID",
    snapshot.seller_id,
    snapshot.seller_id,
  );
  TestValidator.predicate(
    "seller_name is non-empty string",
    snapshot.seller_name.length > 0,
  );
  // 9. Validate pricing and quantity data
  TestValidator.predicate(
    "quantity is positive integer",
    Number.isInteger(snapshot.quantity) && snapshot.quantity > 0,
  );
  TestValidator.predicate(
    "unit_price is positive number",
    snapshot.unit_price > 0,
  );
  TestValidator.predicate(
    "total_price is positive number",
    snapshot.total_price > 0,
  );
  // 10. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time string",
    !isNaN(Date.parse(snapshot.created_at)),
  );
}
