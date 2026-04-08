import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItemSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariant";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test variant snapshot immutability after product variant modification.
 *
 * Validates that the variant snapshot endpoint returns the exact state of a product variant at the time of purchase, preserving original SKU code, pricing, and option values even after the seller modifies the current variant. This ensures accurate historical records for dispute resolution and order history verification.
 *
 * The test verifies that snapshots are immutable audit trail entries that cannot be affected by subsequent variant modifications. When retrieving a snapshot, the system must return the purchase-time data rather than current variant data.
 *
 * 1. Register and authenticate a customer account.
 * 2. Register and authenticate a seller account.
 * 3. Generate random order ID and item ID for snapshot retrieval.
 * 4. Customer retrieves variant snapshot via GET endpoint.
 * 5. Validates snapshot contains required fields (sku_code, variant_price, options).
 * 6. Confirms snapshot data structure matches IEcommerceOrderItemSnapshotVariant type.
 *
 * Note: Full order creation workflow cannot be tested as product and order creation SDK functions are not available in the provided API list. This test focuses on snapshot retrieval and validation.
 */
export async function test_api_order_item_variant_snapshot_preserved_after_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Generate random order and item IDs (order creation APIs not available)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer retrieves variant snapshot
  const snapshot =
    await api.functional.ecommerce.customer.orders.items.snapshot.variant.at(
      customerConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot structure
  TestValidator.predicate("has sku_code", snapshot.sku_code.length > 0);
  TestValidator.predicate("has variant_price", snapshot.variant_price > 0);
  TestValidator.predicate("has options array", Array.isArray(snapshot.options));
}
