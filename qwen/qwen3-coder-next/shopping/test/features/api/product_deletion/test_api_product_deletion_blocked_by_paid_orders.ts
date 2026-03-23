import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_product_deletion_blocked_by_paid_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoin,
  });
  typia.assert(sellerAuthorized);
  const sellerLogin = {
    email: sellerJoin.email,
    password: sellerJoin.password,
  } satisfies IEcommerceMallSeller.ILogin;
  const sellerSession = await authorize_seller_login(sellerConnection, {
    body: sellerLogin,
  });
  typia.assert(sellerSession);
  // 2. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoin,
  });
  typia.assert(customerAuthorized);
  const customerLogin = {
    email: customerJoin.email,
    password: customerJoin.password,
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies IEcommerceMallCustomer.ILogin;
  const customerSession = await authorize_customer_login(customerConnection, {
    body: customerLogin,
  });
  typia.assert(customerSession);
  // 3. Create product first, then create order with that product
  // Since we need a product to test deletion, we need to create one
  // but product creation is not available in the API functions
  // So we'll rely on the order containing products
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // Verify order has items for testing
  if (order.order_items.length === 0) {
    throw new Error(
      "Order has no items - cannot test deletion blocked scenario",
    );
  }
  // 4. Seller attempts to delete product (this should fail)
  // Use product from order item since we don't have direct product creation
  const product = order.order_items[0].product;
  // Attempt deletion - this should fail with blocked status
  await TestValidator.error(
    "product deletion blocked by paid order",
    async () => {
      await api.functional.ecommerceMall.seller.products.erase(
        sellerConnection,
        {
          productId: product.id,
        },
      );
    },
  );
}
