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

export async function test_api_seller_order_item_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate a realistic order item for testing
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create order item by retrieving it
  const orderItem = await api.functional.ecommerceMall.seller.order_items.at(
    sellerConnection,
    { id: orderItemId },
  );
  typia.assert(orderItem);
  // 4. Validate core order item fields
  TestValidator.equals(
    "order item ID matches request",
    orderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "order item quantity positive",
    orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item unit price positive",
    orderItem.unit_price > 0,
  );
  TestValidator.predicate(
    "order item subtotal positive",
    orderItem.subtotal > 0,
  );
  TestValidator.equals(
    "order item deleted_at is NULL (active)",
    orderItem.deleted_at,
    null,
  );
  // 5. Validate order item status
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  TestValidator.predicate(
    "order item status is valid",
    validStatuses.includes(orderItem.status),
  );
  // 6. Validate order information
  TestValidator.predicate(
    "order has order number",
    orderItem.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has status",
    orderItem.order.status.length > 0,
  );
  TestValidator.predicate(
    "order has total price",
    orderItem.order.total_price > 0,
  );
  TestValidator.predicate(
    "order has items count",
    orderItem.order.items_count > 0,
  );
  TestValidator.predicate(
    "order customer has ID",
    orderItem.order.customer.id.length > 0,
  );
  TestValidator.predicate(
    "order shipping address exists",
    orderItem.order.shipping_address !== null,
  );
  // 7. Validate product variant details
  TestValidator.predicate(
    "variant has ID",
    orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "variant has SKU code",
    orderItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant has option values",
    orderItem.productVariant.option_values.length > 0,
  );
  TestValidator.predicate(
    "variant product has name",
    orderItem.productVariant.product.name.length > 0,
  );
  TestValidator.predicate(
    "variant product has base price",
    orderItem.productVariant.product.base_price > 0,
  );
  TestValidator.predicate(
    "variant stock quantity non-negative",
    orderItem.productVariant.stock_quantity >= 0,
  );
  // 8. Validate seller attribution
  TestValidator.predicate("seller has ID", orderItem.seller.id.length > 0);
  TestValidator.predicate(
    "seller has display name",
    orderItem.seller.display_name.length > 0,
  );
  TestValidator.predicate(
    "seller approval status exists",
    orderItem.seller.approval_status.length > 0,
  );
  TestValidator.predicate(
    "seller is suspended flag exists",
    typeof orderItem.seller.is_suspended === "boolean",
  );
  // 9. Validate price calculations
  const expectedSubtotal = orderItem.quantity * orderItem.unit_price;
  TestValidator.equals(
    "subtotal equals quantity * unit_price",
    orderItem.subtotal,
    expectedSubtotal,
  );
  // 10. Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(orderItem.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(orderItem.updated_at)),
  );
  TestValidator.predicate(
    "order created_at is valid date-time",
    !isNaN(Date.parse(orderItem.order.created_at)),
  );
  TestValidator.predicate(
    "variant created_at is valid date-time",
    !isNaN(Date.parse(orderItem.productVariant.created_at)),
  );
  TestValidator.predicate(
    "seller created_at is valid date-time",
    !isNaN(Date.parse(orderItem.seller.created_at)),
  );
  // 11. Validate variant product details
  TestValidator.predicate(
    "variant product has description",
    typeof orderItem.productVariant.product.description === "undefined" ||
      typeof orderItem.productVariant.product.description === "string",
  );
  TestValidator.predicate(
    "variant product has category",
    orderItem.productVariant.product.category.id.length > 0,
  );
  TestValidator.predicate(
    "variant product has seller",
    orderItem.productVariant.product.seller.id.length > 0,
  );
  TestValidator.predicate(
    "variant product availability status",
    typeof orderItem.productVariant.product.availability_status === "string",
  );
  TestValidator.predicate(
    "variant has available variants flag",
    typeof orderItem.productVariant.product.has_available_variants ===
      "boolean",
  );
}
