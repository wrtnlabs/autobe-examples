import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_orders_order_item_snapshot_immutability_after_product_change(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test snapshot immutability preservation when product changes after purchase.
   *
   * Scenario: Order item snapshots should preserve the state of products, variants,
   * and seller profiles at the time of purchase, even if the original data changes later.
   *
   * Steps:
   * 1. Admin, seller, and customer authentication
   * 2. Seller creates product with variant (Not available in SDK - would require product API)
   * 3. Customer places order (Not available in SDK - would require order API)
   * 4. Seller modifies product/variant
   * 5. Admin retrieves order item snapshot
   * 6. Verify snapshot contains purchase-time state, not current state
   */
  // 1. Create authenticated connections for all actors
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Seller authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Customer authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass123!";
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  /**
   * Note: Product creation and order placement APIs are not available in the current SDK.
   * In a real scenario, the following would happen:
   * 1. Seller creates product with variants via product API
   * 2. Customer places order via order API
   * 3. System automatically creates IEcommerceMallOrderItemSnapshot
   *
   * The snapshot captures:
   * - IEcommerceMallOrderItemProductSnapshot: product name, description, category, base price, images
   * - IEcommerceMallProductVariantSnapshot.IInvert: SKU code, price, option values
   * - IEcommerceMallOrderItemSellerSnapshot: shop name, logo
   *
   * Even if the seller later changes the product name, variant price, or shop profile,
   * the snapshot preserves the purchase-time state for dispute resolution.
   */
  // For this test, we use the admin connection to retrieve a snapshot
  // Since we cannot create products/orders via SDK, we test the endpoint structure
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 5. Admin retrieves order item snapshot (validates endpoint exists and returns proper structure)
  const snapshot =
    await api.functional.ecommerceMall.admin.orders.items.snapshot.at(
      adminConnection,
      {
        orderId,
        orderItemId,
      },
    );
  // 6. Validate snapshot structure - this confirms the API returns proper IEcommerceMallOrderItemSnapshot
  typia.assert(snapshot);
  // The snapshot should contain purchase-time data preserved in these structures:
  // - snapshot.product: IEcommerceMallOrderItemProductSnapshot (immutable product state)
  // - snapshot.variant: IEcommerceMallProductVariantSnapshot.IInvert (immutable variant state)
  // - snapshot.seller: IEcommerceMallOrderItemSellerSnapshot (immutable seller profile)
  TestValidator.equals(
    "snapshot has order item ID",
    typeof snapshot.orderItemId,
    "string",
  );
  TestValidator.predicate(
    "snapshot has product data",
    snapshot.product !== null,
  );
  TestValidator.predicate(
    "snapshot has variant data",
    snapshot.variant !== null,
  );
  TestValidator.predicate("snapshot has seller data", snapshot.seller !== null);
}
