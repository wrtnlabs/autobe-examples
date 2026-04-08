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

export async function test_api_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create order with items via checkout (generates sellers, products, variants, cart items, order)
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 3. Extract orderId
  const orderId = order.id;
  // 4. Call PATCH /ecommerceMall/orders/{orderId}/items with status filter 'paid' and pagination
  const itemsPage = await api.functional.ecommerceMall.orders.items.index(
    customerConnection,
    {
      orderId: orderId,
      body: {
        status: "paid",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(itemsPage);
  // 5. Verify response only returns items with 'paid' status
  TestValidator.equals(
    "items count matches order items",
    itemsPage.data.length,
    order.itemsCount,
  );
  for (const item of itemsPage.data) {
    TestValidator.equals("item status is paid", item.status, "paid");
  }
  // 6. Verify items include frozen product snapshots, variant details, and seller information
  for (const item of itemsPage.data) {
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
  // 7. Verify pagination metadata
  TestValidator.predicate(
    "has pagination",
    itemsPage.pagination.pagination !== undefined,
  );
  TestValidator.equals("page is 1", itemsPage.pagination.pagination.current, 1);
  TestValidator.equals(
    "limit is 20",
    itemsPage.pagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records >= 1",
    itemsPage.pagination.pagination.records >= 1,
  );
}
