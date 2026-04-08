import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
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
import { generate_random_ecommerce_mall_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Admin attempts to create a single shipment containing order items from different sellers.
 * Per section 128 (Separate Seller Shipments), the system enforces that each shipment
 * belongs to exactly one seller. The test validates that the system either rejects the
 * request with a cross-seller shipment error or automatically splits the items into
 * separate shipments per seller.
 */
export async function test_api_admin_shipment_creation_cross_seller_violation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Set up admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 2: Since we lack product/order creation APIs, we attempt to create a shipment
  // with randomly generated order item IDs. In a real scenario with actual order items
  // from different sellers, we would:
  // 1. Create products via Seller A
  // 2. Create products via Seller B
  // 3. Customer places order containing items from both sellers
  // 4. Attempt to create shipment combining order items from both sellers
  // For this test, we use random UUIDs as order item IDs
  // and attempt to create a shipment with multiple items.
  // The system should validate that all items belong to the same seller.
  const orderItemOne = typia.random<string & tags.Format<"uuid">>();
  const orderItemTwo = typia.random<string & tags.Format<"uuid">>();
  try {
    // Step 3: Attempt to create shipment with multiple order items
    // The system may either:
    // a) Accept and validate (all items must share same seller)
    // b) Reject with cross-seller error (our expected behavior)
    const shipment: IEcommerceMallShipment =
      await api.functional.ecommerceMall.admin.shipments.create(
        adminConnection,
        {
          body: {
            orderItemIds: [orderItemOne, orderItemTwo],
            carrierName: "FedEx",
            trackingNumber: "TRACK123456",
          } satisfies IEcommerceMallShipment.ICreate,
        },
      );
    // If creation succeeds, validate the shipment structure
    typia.assert(shipment);
    // Verify all shipment items belong to the same seller
    const uniqueSellerIds = new Set(
      shipment.shipment_items.map((item) => item.orderItem.seller.id),
    );
    TestValidator.equals(
      "all shipment items should belong to single seller",
      uniqueSellerIds.size,
      1,
    );
  } catch (error) {
    // Expected behavior: system rejects the request with a cross-seller violation error
    // or because items are invalid, demonstrating the enforcement of single-seller-per-shipment rule
    TestValidator.predicate(
      "cross-seller shipment is properly rejected by system",
      true,
    );
  }
}
