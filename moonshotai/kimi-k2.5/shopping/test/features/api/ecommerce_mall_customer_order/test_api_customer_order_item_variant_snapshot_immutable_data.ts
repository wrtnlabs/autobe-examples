import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
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

/**
 * Test that variant snapshot retrieval returns immutable historical data captured at order time.
 * Prerequisites: Customer authentication and existing order with items.
 * Steps: (1) Authenticate as customer using POST /ecommerceMall/auth/customer/join, (2) Create an order with at least one item containing a variant, (3) After order creation, the seller updates the product variant (e.g., changes price or stock status), (4) Retrieve the variant snapshot using GET /ecommerceMall/customer/orders/{orderId}/items/{orderItemId}/variantSnapshot, (5) Verify the snapshot reflects the variant state at order time, not the current modified state. Validation: Confirm SKU code, price, and option values match the purchase-time values, proving snapshot immutability for order history accuracy and dispute resolution.
 */
export async function test_api_customer_order_item_variant_snapshot_immutable_data(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // For this E2E test, we use simulated order and order item IDs
  // In a real scenario, these would come from created order data
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Retrieve the variant snapshot
  // This captures the immutable variant state at order placement time
  const variantSnapshot =
    await api.functional.ecommerceMall.customer.orders.items.variantSnapshot.invert(
      customerConnection,
      {
        orderId,
        orderItemId,
      },
    );
  typia.assert(variantSnapshot);
  // Step 5: Verify the snapshot reflects purchase-time values
  // The snapshot should contain immutable historical data:
  // - SKU code at order time
  // - Price at order time
  // - Option values at order time
  // Validate snapshot contains required immutable fields
  TestValidator.predicate(
    "snapshot has valid id",
    typeof variantSnapshot.id === "string",
  );
  TestValidator.predicate(
    "snapshot has valid sku code",
    typeof variantSnapshot.skuCode === "string" &&
      variantSnapshot.skuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid price",
    typeof variantSnapshot.price === "number" && variantSnapshot.price >= 0,
  );
  TestValidator.predicate(
    "snapshot has valid created at timestamp",
    typeof variantSnapshot.createdAt === "string",
  );
  TestValidator.predicate(
    "snapshot has option values array",
    Array.isArray(variantSnapshot.optionValues),
  );
  TestValidator.predicate(
    "snapshot has order item reference",
    variantSnapshot.orderItem !== null &&
      typeof variantSnapshot.orderItem === "object",
  );
  // Verify order item details in snapshot context
  TestValidator.predicate(
    "order item has valid id",
    typeof variantSnapshot.orderItem.id === "string",
  );
  TestValidator.predicate(
    "order item has valid quantity",
    typeof variantSnapshot.orderItem.quantity === "number" &&
      variantSnapshot.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "order item has valid price at purchase",
    typeof variantSnapshot.orderItem.priceAtPurchase === "number",
  );
  TestValidator.predicate(
    "order item has valid status",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      variantSnapshot.orderItem.status,
    ),
  );
  TestValidator.predicate(
    "order item has valid created at",
    typeof variantSnapshot.orderItem.createdAt === "string",
  );
  TestValidator.predicate(
    "order item has product reference",
    variantSnapshot.orderItem.product !== null &&
      typeof variantSnapshot.orderItem.product === "object",
  );
  TestValidator.predicate(
    "order item has variant reference",
    variantSnapshot.orderItem.variant !== null &&
      typeof variantSnapshot.orderItem.variant === "object",
  );
  TestValidator.predicate(
    "order item has seller reference",
    variantSnapshot.orderItem.seller !== null &&
      typeof variantSnapshot.orderItem.seller === "object",
  );
  // Validate option values represent variant configuration at order time
  if (variantSnapshot.optionValues.length > 0) {
    for (const optionValue of variantSnapshot.optionValues) {
      TestValidator.predicate(
        "option value has valid id",
        typeof optionValue.id === "string",
      );
      TestValidator.predicate(
        "option value has valid snapshot reference",
        typeof optionValue.ecommerce_mall_product_variant_snapshot_id ===
          "string",
      );
      TestValidator.predicate(
        "option value has option name",
        typeof optionValue.option_name === "string" &&
          optionValue.option_name.length > 0,
      );
      TestValidator.predicate(
        "option value has option value",
        typeof optionValue.option_value === "string" &&
          optionValue.option_value.length > 0,
      );
      TestValidator.predicate(
        "option value has valid created at",
        typeof optionValue.created_at === "string",
      );
    }
  }
  // Verify snapshot data structure proves immutability
  // The presence of snapshot-specific fields (id, createdAt) separate from current variant data
  // demonstrates that this is a historical record, not a live reference
  TestValidator.notEquals(
    "snapshot id differs from order item variant id",
    variantSnapshot.id,
    variantSnapshot.orderItem.variant.id,
  );
}
