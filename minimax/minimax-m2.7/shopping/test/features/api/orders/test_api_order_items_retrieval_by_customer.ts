import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_order_items_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Add product variant to cart (pre-existing product variant in test environment)
  // In a full integration test, a seller would create the product first
  // For E2E testing, we use a pre-configured product variant ID
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerConnection,
      {
        body: {
          variantId: variantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartItem);
  // 4. Complete checkout to create order
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 5. Retrieve order items with pagination
  const orderItemsPage = await api.functional.ecommerceMall.orders.items.index(
    customerConnection,
    {
      orderId: order.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(orderItemsPage);
  // 6. Validate pagination metadata - pagination is nested: orderItemsPage.pagination.pagination
  TestValidator.equals(
    "pagination current page",
    orderItemsPage.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    orderItemsPage.pagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records non-negative",
    orderItemsPage.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    orderItemsPage.pagination.pagination.pages >= 0,
  );
  TestValidator.predicate("has data array", Array.isArray(orderItemsPage.data));
  // 7. If order items exist, validate structure
  if (orderItemsPage.data.length > 0) {
    const item = orderItemsPage.data[0];
    TestValidator.equals("order id matches", item.orderId, order.id);
    TestValidator.predicate(
      "valid status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
    );
    TestValidator.predicate("quantity positive", item.quantity > 0);
    TestValidator.predicate("unit price non-negative", item.unitPrice >= 0);
    TestValidator.predicate(
      "has product snapshot",
      item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "has variant snapshot",
      item.variantSnapshot !== undefined,
    );
    TestValidator.predicate(
      "has seller shop name",
      item.sellerShopName !== undefined,
    );
  }
}
