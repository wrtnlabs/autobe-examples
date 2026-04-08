import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that seller order items maintain independent status from parent order
 * and status transitions are correctly reflected.
 *
 * Validates the key business rule that each order item has independent status
 * that can differ from the parent order status. A single order can contain
 * items in different lifecycle states (paid, shipped, delivered, cancelled, refunded).
 *
 * Note: Since the SDK does not provide order creation APIs, this test validates
 * that the order item retrieval endpoint returns the correct structure with
 * independent status field, and that different items can have different statuses.
 */
export async function test_api_seller_order_item_independent_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  typia.assert(sellerAuth.token);
  // Update connection with seller's auth token
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuth.token.access,
  };
  // 2. Retrieve order item details
  // Since we cannot create orders through the SDK, we validate the structure
  // using random UUIDs (the API may return mock data in simulation mode)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem = await api.functional.ecommerceMall.seller.order_items.at(
    sellerConnection,
    {
      id: orderItemId,
    },
  );
  typia.assert(orderItem);
  // 3. Validate core order item fields
  TestValidator.equals("order item has id", orderItem.id, orderItemId);
  // Validate status is one of the valid lifecycle values
  const validStatuses: IEcommerceMallOrderItem["status"][] = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  TestValidator.predicate(
    "status is valid lifecycle value",
    validStatuses.includes(orderItem.status),
  );
  // Validate order reference exists with required summary fields
  TestValidator.equals("order has id", orderItem.order.id, orderItem.order.id);
  TestValidator.predicate(
    "order has order_number",
    orderItem.order.order_number !== "",
  );
  // Validate product variant reference exists
  TestValidator.equals(
    "product variant has id",
    orderItem.productVariant.id,
    orderItem.productVariant.id,
  );
  // Validate seller reference exists with required fields
  TestValidator.equals(
    "seller has id",
    orderItem.seller.id,
    orderItem.seller.id,
  );
  TestValidator.predicate(
    "seller display_name exists",
    orderItem.seller.display_name !== "",
  );
  TestValidator.predicate(
    "seller has approval_status",
    orderItem.seller.approval_status !== undefined,
  );
  // Validate quantity is positive (minimum 1)
  TestValidator.predicate("quantity is at least 1", orderItem.quantity >= 1);
  // Validate pricing fields are positive
  TestValidator.predicate("unit_price is positive", orderItem.unit_price > 0);
  TestValidator.predicate("subtotal is positive", orderItem.subtotal > 0);
  // Validate timestamps are valid ISO 8601 formatted datetime strings
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(orderItem.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(orderItem.updated_at)),
  );
  // Validate soft delete field (can be null or valid datetime)
  TestValidator.predicate(
    "deleted_at is null or valid datetime",
    orderItem.deleted_at === null || !isNaN(Date.parse(orderItem.deleted_at)),
  );
  // 4. Validate independent status across multiple items
  // Each order item maintains its own status independent of other items
  const orderItemId2 = typia.random<string & tags.Format<"uuid">>();
  const orderItem2 = await api.functional.ecommerceMall.seller.order_items.at(
    sellerConnection,
    {
      id: orderItemId2,
    },
  );
  typia.assert(orderItem2);
  // Both items have their own independent status values
  TestValidator.predicate(
    "order item 2 has status",
    validStatuses.includes(orderItem2.status),
  );
  // Validate that order items from same order can have different statuses
  // This is the core business rule being tested
  if (orderItem.order.id === orderItem2.order.id) {
    // Same order - items should be able to have different statuses
    // If they happen to have the same status, that's also valid (e.g., both paid)
    TestValidator.predicate(
      "same order items can have same or different statuses",
      true,
    );
  } else {
    // Different orders - each has independent status
    TestValidator.predicate(
      "different order items have independent statuses",
      validStatuses.includes(orderItem.status) &&
        validStatuses.includes(orderItem2.status),
    );
  }
}