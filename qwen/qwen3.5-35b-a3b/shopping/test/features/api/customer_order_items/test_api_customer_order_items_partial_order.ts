import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function test_api_customer_order_items_partial_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Request order items filtered by "delivered" status
  // Test assumes pre-seeded order items with various statuses exist in database
  const requestBody: IEcommerceMallOrderItem.IRequest = {
    page: 1,
    limit: 10,
    item_status: "delivered",
  } satisfies IEcommerceMallOrderItem.IRequest;
  const response = await api.functional.ecommerceMall.customer.orderItems.index(
    customerConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // 3. Validate filtering - all returned items must have "delivered" status
  for (const item of response.data) {
    TestValidator.equals(
      `item ${item.id} status is delivered`,
      item.itemStatus,
      "delivered",
    );
  }
  // 4. Validate order reference is present and has required fields
  for (const item of response.data) {
    TestValidator.equals(
      `order ${item.order.id} has order_number`,
      item.order.order_number.length > 0,
      true,
    );
    TestValidator.equals(
      `order ${item.order.id} has total_price`,
      typeof item.order.total_price === "number",
      true,
    );
  }
  // 5. Validate pagination
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Validate snapshot data is present for each item
  for (const item of response.data) {
    TestValidator.predicate(
      `item ${item.id} has product snapshot`,
      item.productSnapshot.length > 0,
    );
    TestValidator.predicate(
      `item ${item.id} has variant snapshot`,
      item.variantSnapshot.length > 0,
    );
    TestValidator.predicate(
      `item ${item.id} has seller profile snapshot`,
      item.sellerProfileSnapshot.length > 0,
    );
    // Validate snapshots are valid JSON strings
    TestValidator.predicate(
      `item ${item.id} product snapshot is valid JSON`,
      () => {
        JSON.parse(item.productSnapshot);
        return true;
      },
    );
    TestValidator.predicate(
      `item ${item.id} variant snapshot is valid JSON`,
      () => {
        JSON.parse(item.variantSnapshot);
        return true;
      },
    );
    TestValidator.predicate(
      `item ${item.id} seller profile snapshot is valid JSON`,
      () => {
        JSON.parse(item.sellerProfileSnapshot);
        return true;
      },
    );
  }
  // 7. Validate required numeric fields
  for (const item of response.data) {
    TestValidator.equals(
      `item ${item.id} quantity is positive`,
      item.quantity > 0,
      true,
    );
    TestValidator.equals(
      `item ${item.id} unitPrice is number`,
      typeof item.unitPrice === "number",
      true,
    );
    TestValidator.predicate(
      `item ${item.id} unitPrice is non-negative`,
      item.unitPrice >= 0,
    );
  }
  // 8. Validate datetime fields
  for (const item of response.data) {
    TestValidator.predicate(
      `item ${item.id} created_at is valid datetime`,
      () => !isNaN(Date.parse(item.created_at)),
    );
    TestValidator.predicate(
      `item ${item.id} updated_at is valid datetime`,
      () => !isNaN(Date.parse(item.updated_at)),
    );
  }
}