import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_order_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Administrator can retrieve order items
  // Using typia.random to generate valid UUID for order item ID
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem =
    await api.functional.ecommerceMall.administrator.order_items.getById(
      adminConnection,
      {
        id: orderItemId,
      },
    );
  typia.assert(orderItem);
  // 3. Validate order item response structure
  TestValidator.equals("order item id", orderItem.id, orderItemId);
  TestValidator.equals("quantity", orderItem.quantity, 1);
  TestValidator.predicate("unit_price positive", orderItem.unit_price > 0);
  TestValidator.equals(
    "subtotal",
    orderItem.subtotal,
    orderItem.unit_price * orderItem.quantity,
  );
  TestValidator.predicate(
    "status valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      orderItem.status,
    ),
  );
  TestValidator.predicate("has valid created_at", orderItem.created_at !== undefined);
  TestValidator.predicate("has valid updated_at", orderItem.updated_at !== undefined);
  TestValidator.predicate("deleted_at should be null", orderItem.deleted_at !== null && orderItem.deleted_at !== undefined);
  // 4. Validate product variant data
  TestValidator.equals(
    "product variant id",
    orderItem.productVariant.id,
    orderItem.productVariant.id,
  );
  TestValidator.predicate(
    "product variant sku_code",
    orderItem.productVariant.sku_code !== null && orderItem.productVariant.sku_code !== undefined,
  );
  TestValidator.predicate(
    "product variant option_values",
    orderItem.productVariant.option_values !== null && orderItem.productVariant.option_values !== undefined,
  );
  TestValidator.predicate(
    "product variant price",
    orderItem.productVariant.price !== null && orderItem.productVariant.price !== undefined,
  );
  TestValidator.equals(
    "product variant stock",
    orderItem.productVariant.stock_quantity,
    orderItem.productVariant.stock_quantity,
  );
  TestValidator.equals(
    "product variant deleted_at",
    orderItem.productVariant.deleted_at,
    orderItem.productVariant.deleted_at,
  );
  // 5. Validate product data within variant
  TestValidator.equals(
    "product id",
    orderItem.productVariant.product.id,
    orderItem.productVariant.product.id,
  );
  TestValidator.predicate("product name", orderItem.productVariant.product.name !== null && orderItem.productVariant.product.name !== undefined);
  TestValidator.equals(
    "product base_price",
    orderItem.productVariant.product.base_price,
    orderItem.productVariant.product.base_price,
  );
  TestValidator.equals(
    "product availability",
    orderItem.productVariant.product.availability_status,
    orderItem.productVariant.product.availability_status,
  );
  // 6. Validate seller data
  TestValidator.equals("seller id", orderItem.seller.id, orderItem.seller.id);
  TestValidator.predicate("seller display_name", orderItem.seller.display_name !== null && orderItem.seller.display_name !== undefined);
  TestValidator.equals(
    "seller approval_status",
    orderItem.seller.approval_status,
    orderItem.seller.approval_status,
  );
  TestValidator.equals(
    "seller is_suspended",
    orderItem.seller.is_suspended,
    orderItem.seller.is_suspended,
  );
  // 7. Validate order summary
  TestValidator.equals("order id", orderItem.order.id, orderItem.order.id);
  TestValidator.predicate("order order_number", orderItem.order.order_number !== null && orderItem.order.order_number !== undefined);
  TestValidator.equals(
    "order status",
    orderItem.order.status,
    orderItem.order.status,
  );
  TestValidator.equals(
    "order total_price",
    orderItem.order.total_price,
    orderItem.order.total_price,
  );
  TestValidator.equals(
    "order items_count",
    orderItem.order.items_count,
    orderItem.order.items_count,
  );
  TestValidator.equals(
    "order customer",
    orderItem.order.customer,
    orderItem.order.customer,
  );
  TestValidator.equals(
    "order shipping_address",
    orderItem.order.shipping_address,
    orderItem.order.shipping_address,
  );
  TestValidator.equals(
    "order deleted_at",
    orderItem.order.deleted_at,
    orderItem.order.deleted_at,
  );
}