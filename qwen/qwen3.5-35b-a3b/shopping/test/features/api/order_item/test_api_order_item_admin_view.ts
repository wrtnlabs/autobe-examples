import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_item_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate order item UUID to view
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. View order item via admin endpoint
  const orderItem = await api.functional.ecommerceMall.admin.order_items.at(
    adminConnection,
    {
      orderItemId: orderItemId,
    },
  );
  typia.assert(orderItem);
  // 4. Validate order item has all required fields
  TestValidator.equals(
    "order item id matches request",
    orderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "has valid item status",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      orderItem.item_status,
    ),
  );
  TestValidator.predicate(
    "quantity is positive integer",
    orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "unit price is non-negative",
    orderItem.unit_price >= 0,
  );
  // 5. Validate snapshot strings are valid JSON
  const productSnapshot = JSON.parse(orderItem.product_snapshot);
  TestValidator.equals(
    "product snapshot has id",
    productSnapshot.id,
    orderItem.product.id,
  );
  TestValidator.equals(
    "product snapshot has name",
    productSnapshot.name,
    orderItem.product.name,
  );
  TestValidator.equals(
    "product snapshot has base_price",
    productSnapshot.base_price,
    orderItem.product.base_price,
  );
  const variantSnapshot = JSON.parse(orderItem.variant_snapshot);
  TestValidator.equals(
    "variant snapshot has skuCode",
    variantSnapshot.skuCode,
    orderItem.productVariant.skuCode,
  );
  TestValidator.equals(
    "variant snapshot has stockQuantity",
    variantSnapshot.stockQuantity,
    orderItem.productVariant.stockQuantity,
  );
  const sellerSnapshot = JSON.parse(orderItem.seller_profile_snapshot);
  TestValidator.equals(
    "seller snapshot has email",
    sellerSnapshot.email,
    orderItem.product.seller.email,
  );
  // 6. Validate parent order summary
  TestValidator.equals("order has id", orderItem.order.id, orderItem.order.id);
  TestValidator.predicate(
    "order has order_number",
    orderItem.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has total price",
    orderItem.order.total_price > 0,
  );
  // 7. Validate timestamps
  const createdAt = new Date(orderItem.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  const updatedAt = new Date(orderItem.updated_at);
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
}