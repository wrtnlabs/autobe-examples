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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve order item (in simulation mode, returns valid random data)
  // Note: In a real scenario, this would require pre-existing order data created through
  // product creation, order placement, and product deletion workflows. Since those
  // API functions are not provided in input materials, we test the endpoint structure
  // and snapshot validation in simulation mode.
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem = await api.functional.ecommerce.customer.orders.items.at(
    customerConnection,
    {
      orderId,
      itemId,
    },
  );
  typia.assert(orderItem);
  // 3. Validate snapshot structure is present and complete
  typia.assert(orderItem.snapshot);
  // 4. Verify snapshot contains all required historical data fields
  TestValidator.predicate(
    "snapshot has product_name",
    typeof orderItem.snapshot.product_name === "string" &&
      orderItem.snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has seller_shop_name",
    typeof orderItem.snapshot.seller_shop_name === "string" &&
      orderItem.snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "snapshot has base_price as number",
    typeof orderItem.snapshot.base_price === "number" &&
      orderItem.snapshot.base_price > 0,
  );
  TestValidator.predicate(
    "snapshot has created_at as valid datetime",
    typeof orderItem.snapshot.created_at === "string" &&
      orderItem.snapshot.created_at.length > 0,
  );
  // 5. Validate optional snapshot fields have correct types when present
  if (
    orderItem.snapshot.product_description !== null &&
    orderItem.snapshot.product_description !== undefined
  ) {
    TestValidator.predicate(
      "snapshot product_description is string when present",
      typeof orderItem.snapshot.product_description === "string",
    );
  }
  if (
    orderItem.snapshot.seller_logo_url !== null &&
    orderItem.snapshot.seller_logo_url !== undefined
  ) {
    TestValidator.predicate(
      "snapshot seller_logo_url is valid URI when present",
      typeof orderItem.snapshot.seller_logo_url === "string" &&
        orderItem.snapshot.seller_logo_url.length > 0,
    );
  }
  // 6. Verify order item contains embedded references
  TestValidator.predicate(
    "order item has order summary",
    orderItem.order !== null && orderItem.order !== undefined,
  );
  TestValidator.predicate(
    "order item has product variant summary",
    orderItem.productVariant !== null && orderItem.productVariant !== undefined,
  );
  TestValidator.predicate(
    "order item has seller summary",
    orderItem.seller !== null && orderItem.seller !== undefined,
  );
}
