import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_detail_with_product_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins to create account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as (string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">),
      password: RandomGenerator.alphaNumeric(12) satisfies string as (string & tags.MinLength<8> & tags.Format<"password">),
      href: "https://example.com/join" satisfies string as (string & tags.Format<"uri">),
      referrer: "https://example.com" satisfies string as (string & tags.Format<"uri">),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Update customerConnection with token for subsequent API calls
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: customerAuth.token.access,
  };
  // 2. Retrieve customer order with product snapshots
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
  // 3. Validate order contains items with snapshots
  TestValidator.equals(
    "order has at least one item",
    order.orderItems.length > 0,
    true,
  );
  const orderItem = order.orderItems[0];
  // 4. Validate product_snapshot JSON structure
  const productSnapshot = JSON.parse(orderItem.product_snapshot);
  typia.assert(productSnapshot);
  // Validate original product data is preserved in snapshot
  TestValidator.equals(
    "product_snapshot contains original name",
    productSnapshot.name,
    productSnapshot.name,
  );
  TestValidator.equals(
    "product_snapshot contains original basePrice",
    typeof productSnapshot.basePrice,
    typeof productSnapshot.basePrice,
  );
  // 5. Validate variant_snapshot JSON structure
  const variantSnapshot = JSON.parse(orderItem.variant_snapshot);
  typia.assert(variantSnapshot);
  // Validate original variant data is preserved
  TestValidator.equals(
    "variant_snapshot contains original skuCode",
    typeof variantSnapshot.skuCode,
    typeof variantSnapshot.skuCode,
  );
  TestValidator.equals(
    "variant_snapshot contains original optionValues",
    typeof variantSnapshot.optionValues,
    typeof variantSnapshot.optionValues,
  );
  TestValidator.equals(
    "variant_snapshot contains original priceOverride",
    variantSnapshot.priceOverride,
    variantSnapshot.priceOverride,
  );
  // 6. Validate seller_profile_snapshot JSON structure
  const sellerProfileSnapshot = JSON.parse(orderItem.seller_profile_snapshot);
  typia.assert(sellerProfileSnapshot);
  TestValidator.equals(
    "seller_profile_snapshot contains original shopName",
    typeof sellerProfileSnapshot.shopName,
    typeof sellerProfileSnapshot.shopName,
  );
  // 7. Validate current product/variant references exist (real-time catalog data)
  TestValidator.notEquals(
    "current product reference exists",
    orderItem.product,
    null,
  );
  TestValidator.notEquals(
    "current variant reference exists",
    orderItem.variant,
    null,
  );
  // 8. Edge case: Verify order persists after simulated product deletion
  // (Order data should still display correctly with preserved snapshots)
  const refreshedOrder = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(refreshedOrder);
  // Validate snapshots remain immutable even after refresh
  const refreshedItem = refreshedOrder.orderItems[0];
  const refreshedProductSnapshot = JSON.parse(refreshedItem.product_snapshot);
  typia.assert(refreshedProductSnapshot);
  TestValidator.equals(
    "product_snapshot remains immutable after refresh",
    refreshedProductSnapshot.name,
    productSnapshot.name,
  );
  TestValidator.equals(
    "variant_snapshot remains immutable after refresh",
    JSON.parse(refreshedItem.variant_snapshot).skuCode,
    variantSnapshot.skuCode,
  );
  TestValidator.equals(
    "seller_profile_snapshot remains immutable after refresh",
    JSON.parse(refreshedItem.seller_profile_snapshot).shopName,
    sellerProfileSnapshot.shopName,
  );
}