import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";

/**
 * Test paginated listing of order items for a specific customer order.
 *
 * Authenticates a customer, creates an order containing 50 line items, and retrieves
 * the items using page-based pagination with a limit of 10 items per page.
 * Validates that the pagination metadata correctly reflects the total number of records,
 * the current page number, and that sequential requests successfully retrieve distinct
 * subsets of the 50 items. Verifies that the server maintains accurate pagination state
 * across multiple paginated requests.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Generate 50 random order items with product variants, quantities, and prices.
 * 3. Create the order linking to a random shipping address.
 * 4. Fetch the first page with a limit of 10 items.
 * 5. Validate the first page returns exactly 10 items, total records is 50, and current page is 1.
 * 6. Fetch the second page with a limit of 10 items.
 * 7. Validate the second page returns exactly 10 items, total records is 50, and current page is 2.
 */
export async function test_api_order_item_list_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Create an order with a large number of items
  const items = ArrayUtil.repeat(50, () =>
    typia.random<IEcommercePlatformOrderItem.ICreate>(),
  );
  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    {
      body: {
        items: items satisfies IEcommercePlatformOrderItem.ICreate[] &
          tags.MinItems<1>,
        shipping_address_id: shippingAddressId,
      } satisfies IEcommercePlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // 3. Request first page of items
  const firstPage =
    await api.functional.ecommercePlatform.customer.orders.items.index(
      customerConnection,
      {
        orderNumber: order.order_number,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformOrderItem.IRequest,
      },
    );
  typia.assert(firstPage);
  // 4. Validate first page results
  TestValidator.equals(
    "first page returns correct number of items",
    firstPage.data.length,
    10,
  );
  TestValidator.equals(
    "pagination shows correct total records",
    firstPage.pagination.records,
    50,
  );
  TestValidator.equals(
    "pagination current page is 1",
    firstPage.pagination.current,
    1,
  );
  // 5. Request second page of items
  const secondPage =
    await api.functional.ecommercePlatform.customer.orders.items.index(
      customerConnection,
      {
        orderNumber: order.order_number,
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommercePlatformOrderItem.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page returns correct number of items",
    secondPage.data.length,
    10,
  );
  TestValidator.equals(
    "second page current is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page total records matches",
    secondPage.pagination.records,
    50,
  );
}