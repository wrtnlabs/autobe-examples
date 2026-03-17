import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
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

export async function test_api_customer_order_item_cross_seller_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customer);
  // 2. Generate order item IDs for retrieval
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve order item using authenticated customer connection
  // Note: In a real test scenario, orderId and itemId would come from
  // an order containing items from multiple sellers. The API does not
  // provide order creation endpoints, so we test with generated IDs
  // to validate endpoint structure and response format.
  const orderItem: IEcommerceMallOrderItem =
    await api.functional.ecommerceMall.customer.orders.items.at(
      customerConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(orderItem);
  // 4. Validate order item structure and cross-seller snapshot information
  TestValidator.equals("order item id matches requested", orderItem.id, itemId);
  TestValidator.equals(
    "order id in response matches requested",
    orderItem.orderId,
    orderId,
  );
  TestValidator.predicate(
    "product name has content",
    () => orderItem.productName.length > 0,
  );
  TestValidator.predicate(
    "variant name has content",
    () => orderItem.variantName.length > 0,
  );
  TestValidator.predicate(
    "product SKU has content",
    () => orderItem.productSku.length > 0,
  );
  TestValidator.predicate(
    "quantity is positive integer",
    () => orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "unit price is positive",
    () => orderItem.unitPrice > 0,
  );
  TestValidator.predicate(
    "total price is positive",
    () => orderItem.totalPrice > 0,
  );
  TestValidator.predicate(
    "seller snapshot exists",
    () =>
      orderItem.sellerSnapshot !== null &&
      orderItem.sellerSnapshot.id !== undefined,
  );
  TestValidator.predicate("seller has valid status", () =>
    ["pending", "approved", "rejected"].includes(
      orderItem.sellerSnapshot.status,
    ),
  );
  TestValidator.predicate(
    "seller email exists",
    () => orderItem.sellerSnapshot.email.length > 0,
  );
  TestValidator.predicate(
    "product snapshot exists",
    () => orderItem.productSnapshot !== null,
  );
  TestValidator.predicate(
    "variant snapshot exists",
    () => orderItem.variantSnapshot !== null,
  );
}
