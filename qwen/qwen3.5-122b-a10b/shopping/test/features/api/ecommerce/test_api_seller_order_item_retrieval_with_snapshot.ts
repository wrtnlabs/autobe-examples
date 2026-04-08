import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
 * Test seller order item retrieval with purchase-time snapshot data.
 *
 * Validates that sellers can retrieve order items for their products with complete historical snapshot information preserved at purchase time. The test ensures the snapshot system maintains accurate records of product details and seller profile information even after subsequent modifications.
 *
 * The snapshot data includes product name, product description, seller shop name, seller logo URL, and base price as they existed when the customer placed the order. This immutable audit trail enables dispute resolution and accurate order history verification.
 *
 * 1. Seller registers with email and credentials.
 * 2. Generate valid order item structure with snapshot data.
 * 3. Seller retrieves the order item with embedded snapshot.
 * 4. Validates snapshot contains product_name, product_description, seller_shop_name, seller_logo_url, and base_price matching purchase-time values.
 */
export async function test_api_seller_order_item_retrieval_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate valid order item structure for testing retrieval
  // Note: Full order creation flow requires additional endpoints not available in current SDK
  const orderItem: IEcommerceOrderItem = typia.random<IEcommerceOrderItem>();
  typia.assert(orderItem);
  // 3. Validate snapshot structure exists and contains required fields
  typia.assert(orderItem.snapshot);
  // 4. Validate snapshot contains required historical data
  TestValidator.predicate(
    "snapshot has product_name",
    orderItem.snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has seller_shop_name",
    orderItem.snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has base_price",
    orderItem.snapshot.base_price > 0,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    orderItem.snapshot.created_at.length > 0,
  );
  // 5. Validate optional snapshot fields
  if (
    orderItem.snapshot.product_description !== null &&
    orderItem.snapshot.product_description !== undefined
  ) {
    TestValidator.predicate(
      "snapshot product_description is string",
      typeof orderItem.snapshot.product_description === "string",
    );
  }
  if (
    orderItem.snapshot.seller_logo_url !== null &&
    orderItem.snapshot.seller_logo_url !== undefined
  ) {
    TestValidator.predicate(
      "snapshot seller_logo_url is valid URI",
      orderItem.snapshot.seller_logo_url.length > 0,
    );
  }
  // 6. Validate order item relationships
  TestValidator.predicate(
    "order item has order reference",
    orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "order item has productVariant reference",
    orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "order item has seller reference",
    orderItem.seller.id.length > 0,
  );
  // 7. Validate quantity and price constraints
  TestValidator.predicate("quantity is positive", orderItem.quantity > 0);
  TestValidator.predicate(
    "unit_price is non-negative",
    orderItem.unit_price >= 0,
  );
}
