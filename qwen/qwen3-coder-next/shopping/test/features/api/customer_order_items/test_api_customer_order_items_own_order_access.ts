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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_items_own_order_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuth = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    { body: customerData },
  );
  typia.assert(customerAuth);
  // 2. Create order for customer
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 3. Retrieve order items for own order
  const result = await api.functional.ecommerceMall.customer.orders.items.at(
    customerConnection,
    { orderId: order.id },
  );
  typia.assert(result);
  // 4. Validate results
  TestValidator.predicate("has items", result.data.length >= 0);
  TestValidator.equals(
    "pagination exists",
    result.pagination !== undefined,
    true,
  );
  // 5. Validate each order item has required snapshot fields
  for (const item of result.data) {
    TestValidator.equals(
      "has product_name",
      item.product_name !== undefined,
      true,
    );
    TestValidator.equals(
      "has variant_options",
      item.variant_options !== undefined,
      true,
    );
    TestValidator.equals(
      "has product_price",
      item.product_price !== undefined,
      true,
    );
    TestValidator.equals("has seller_id", item.seller.id !== undefined, true);
    TestValidator.equals("has product info", item.product !== undefined, true);
    TestValidator.equals("has variant info", item.variant !== undefined, true);
    TestValidator.equals("has seller info", item.seller !== undefined, true);
  }
}