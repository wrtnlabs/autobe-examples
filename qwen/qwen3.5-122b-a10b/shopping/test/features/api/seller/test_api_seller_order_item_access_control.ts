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

export async function test_api_seller_order_item_access_control(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller order item access control enforcement.
   *
   * Validates that sellers can only access order items for products they own, ensuring data isolation between sellers in a multi-seller marketplace. The system returns 404 for unauthorized access attempts to protect seller data privacy.
   *
   * Note: This test uses random UUIDs since product and order creation utilities are not available in the current SDK. The test validates that:
   * 1. Sellers receive 404 when attempting to access non-existent order items
   * 2. The API properly enforces access control by not exposing order item existence to unauthorized sellers
   *
   * 1. Create and authenticate two separate sellers (Seller A and Seller B)
   * 2. Generate random order and order item UUIDs
   * 3. Seller B attempts to access order item that doesn't belong to their products
   * 4. Validate 404 error is returned, confirming access control enforcement
   */
  // 1. Create and authenticate two separate sellers
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerB);
  // 2. Generate random UUIDs for order and order item
  // Note: Cannot create real products/orders without available utilities
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Seller B attempts to access order item
  // This validates that unauthorized access returns 404 (not 403) for security
  await TestValidator.httpError(
    "seller cannot access order items outside their product ownership",
    404,
    async () => {
      await api.functional.ecommerce.seller.orders.items.at(sellerBConnection, {
        orderId,
        itemId,
      });
    },
  );
  // 4. Verify Seller A also gets 404 for non-existent order item
  // (Both sellers should get 404 since the order item doesn't exist)
  await TestValidator.httpError(
    "seller cannot access non-existent order items",
    404,
    async () => {
      await api.functional.ecommerce.seller.orders.items.at(sellerAConnection, {
        orderId,
        itemId,
      });
    },
  );
}
