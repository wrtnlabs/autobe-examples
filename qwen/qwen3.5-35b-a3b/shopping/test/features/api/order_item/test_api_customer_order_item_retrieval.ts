import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

export async function test_api_customer_order_item_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Generate random order item data
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem = await api.functional.ecommerceMall.customer.order_items.at(
    customerConnection,
    { orderItemId },
  );
  typia.assert(orderItem);
  // 3. Validate order item status
  TestValidator.equals("item status is paid", orderItem.item_status, "paid");
  // 4. Validate quantity constraints
  TestValidator.predicate(
    "quantity is positive integer",
    orderItem.quantity > 0,
  );
  // 5. Validate unit price
  TestValidator.predicate(
    "unit price is non-negative",
    orderItem.unit_price >= 0,
  );
  // 6. Validate snapshots are strings
  TestValidator.equals(
    "product_snapshot is string",
    orderItem.product_snapshot,
    orderItem.product_snapshot,
  );
  TestValidator.equals(
    "variant_snapshot is string",
    orderItem.variant_snapshot,
    orderItem.variant_snapshot,
  );
  TestValidator.equals(
    "seller_profile_snapshot is string",
    orderItem.seller_profile_snapshot,
    orderItem.seller_profile_snapshot,
  );
  // 7. Validate order relationship exists
  TestValidator.equals(
    "order relationship exists",
    orderItem.order,
    orderItem.order,
  );
  // 8. Validate product relationship exists
  TestValidator.equals(
    "product relationship exists",
    orderItem.product,
    orderItem.product,
  );
  // 9. Validate product variant relationship exists
  TestValidator.equals(
    "product variant relationship exists",
    orderItem.productVariant,
    orderItem.productVariant,
  );
  // 10. Validate timestamps are properly formatted
  TestValidator.predicate(
    "created_at is valid date-time string",
    () => !isNaN(Date.parse(orderItem.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time string",
    () => !isNaN(Date.parse(orderItem.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at can be null or valid date-time",
    () =>
      orderItem.deleted_at === null || !isNaN(Date.parse(orderItem.deleted_at)),
  );
}
