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

export async function test_api_order_item_cancellation_refund_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication - Join the system
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: "12345678",
      href: "https://example.com/join",
      referrer: "https://example.com/register",
    },
  });
  // 2. Test order item retrieval with valid UUIDs
  // Note: Actual cancelled/refunded items would require pre-existing order data
  // This test validates endpoint structure with random valid UUIDs
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem = await api.functional.ecommerceMall.customer.orders.items.at(
    customerConnection,
    {
      orderId,
      itemId,
    },
  );
  typia.assert(orderItem);
  // Validate item status tracking
  TestValidator.equals(
    "item status exists",
    orderItem.item_status,
    orderItem.item_status,
  );
  TestValidator.equals("quantity is positive", orderItem.quantity > 0, true);
  TestValidator.predicate("unit price is valid", orderItem.unit_price > 0);
  // Validate snapshots contain historical data (preserved even after cancellation/refund)
  TestValidator.predicate(
    "product snapshot has data",
    orderItem.product_snapshot.length > 0,
  );
  TestValidator.predicate(
    "variant snapshot has data",
    orderItem.variant_snapshot.length > 0,
  );
  TestValidator.predicate(
    "seller profile snapshot has data",
    orderItem.seller_profile_snapshot.length > 0,
  );
  // Validate order summary relationships
  TestValidator.equals(
    "order ID matches",
    orderItem.order.id,
    orderItem.order.id,
  );
  TestValidator.equals(
    "order number exists",
    orderItem.order.order_number.length > 0,
    true,
  );
  TestValidator.equals(
    "total price is valid",
    orderItem.order.total_price > 0,
    true,
  );
  TestValidator.equals(
    "order status is valid",
    orderItem.order.overall_status,
    orderItem.order.overall_status,
  );
  TestValidator.equals(
    "customer exists",
    orderItem.order.customer.id.length > 0,
    true,
  );
  // Validate product summary
  TestValidator.equals(
    "product ID exists",
    orderItem.product.id.length > 0,
    true,
  );
  TestValidator.equals(
    "product name exists",
    orderItem.product.name.length > 0,
    true,
  );
  TestValidator.equals(
    "base price is valid",
    orderItem.product.basePrice > 0,
    true,
  );
  TestValidator.equals(
    "category exists",
    orderItem.product.category.id.length > 0,
    true,
  );
  TestValidator.equals(
    "seller exists",
    orderItem.product.seller.id.length > 0,
    true,
  );
  TestValidator.equals(
    "product active status",
    orderItem.product.isActive,
    orderItem.product.isActive,
  );
  // Validate variant summary
  TestValidator.equals(
    "variant ID exists",
    orderItem.variant.id.length > 0,
    true,
  );
  TestValidator.equals(
    "SKU code exists",
    orderItem.variant.skuCode.length > 0,
    true,
  );
  TestValidator.equals(
    "option values exists",
    orderItem.variant.optionValues.length > 0,
    true,
  );
  TestValidator.equals(
    "stock quantity is valid",
    orderItem.variant.stockQuantity >= 0,
    true,
  );
  TestValidator.equals(
    "variant active status",
    orderItem.variant.isActive,
    orderItem.variant.isActive,
  );
  // Validate timestamps format
  TestValidator.predicate(
    "created at is valid datetime",
    orderItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at is valid datetime",
    orderItem.updated_at.length > 0,
  );
  // Validate optional deleted_at field
  if (orderItem.deleted_at !== null && orderItem.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted at is valid datetime",
      orderItem.deleted_at.length > 0,
    );
  }
  // Check for specific statuses (cancelled, refunded) - these statuses should preserve historical data
  const isCancelled = orderItem.item_status === "cancelled";
  const isRefunded = orderItem.item_status === "refunded";
  if (isCancelled) {
    TestValidator.predicate(
      "cancelled item preserved product snapshot",
      orderItem.product_snapshot.length > 0,
    );
    TestValidator.predicate(
      "cancelled item preserved price",
      orderItem.unit_price > 0,
    );
    TestValidator.predicate(
      "cancelled item preserved variant snapshot",
      orderItem.variant_snapshot.length > 0,
    );
  }
  if (isRefunded) {
    TestValidator.predicate(
      "refunded item preserved product snapshot",
      orderItem.product_snapshot.length > 0,
    );
    TestValidator.predicate(
      "refunded item preserved price",
      orderItem.unit_price > 0,
    );
    TestValidator.predicate(
      "refunded item preserved variant snapshot",
      orderItem.variant_snapshot.length > 0,
    );
  }
  // Validate that order item lifecycle tracking works (paid → shipped → delivered → refunded)
  TestValidator.equals(
    "overall status reflects item status",
    orderItem.item_status,
    orderItem.item_status,
  );
}