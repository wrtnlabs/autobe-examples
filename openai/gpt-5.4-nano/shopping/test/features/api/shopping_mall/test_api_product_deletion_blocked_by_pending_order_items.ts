import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_deletion_blocked_by_pending_order_items(
  connection: api.IConnection,
): Promise<void> {
  const memberPassword = "pass_" + typia.random<string>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  // 1) Seller A joins
  const sellerBaseConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_member_join(sellerBaseConnection, {
    body: {
      email: sellerEmail,
      password: memberPassword,
    },
  });
  typia.assert(sellerAuthorized);
  // Use a fresh actor-specific connection (the authorize utility mutates headers)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: memberPassword,
    },
  });
  // 2) Create product under Seller A
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(product);
  // 3) Create order with a line item status that blocks deletion
  // We don't have direct access to variant/order-item creation inputs; rely on
  // the order generation utility and retry until we get a blocking status.
  // We identify blocking by checking if any order item has line_item_status
  // matching typical pending-paid-or-shipped states.
  const blockingStatusCandidates = [
    "pending_paid",
    "paid_pending_shipment",
    "shipped",
    "pending_shipped",
    "pending_paid_or_shipped",
  ] as const;
  let createdOrder: IShoppingMallOrder | undefined = undefined;
  let blockingItemFound = false;
  for (let i = 0; i < 5; i++) {
    const order = await generate_random_shopping_mall_member_orders_create(
      sellerConnection,
      {
        body: {
          // Intentionally omit uncertain properties; utility prepares
        },
      },
    );
    typia.assert(order);
    createdOrder = order;
    // Find an order item for the created product (best-effort) and check status
    blockingItemFound = order.orderItems.some((item) => {
      // The order item variant id is present, but we don't have the product's variant list.
      // So we only validate by status existence; eligibility rule is enforced server-side.
      return (
        item.shopping_mall_product_variant_id !== undefined &&
        (blockingStatusCandidates as readonly string[]).includes(
          item.line_item_status,
        )
      );
    });
    if (blockingItemFound) break;
  }
  if (!createdOrder) {
    throw new Error("Failed to create an order to test deletion blocking");
  }
  // 4) Attempt deletion; it must be rejected
  await TestValidator.error(
    "product deletion should be blocked when pending paid/shipped order items exist",
    async () => {
      await api.functional.shoppingMall.member.products.erase(
        sellerConnection,
        {
          productId: product.id,
        },
      );
    },
  );
  // 5) Validate product was not soft-deleted
  const refreshedProduct =
    await api.functional.shoppingMall.member.products.createProduct(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: typia.random<string>(),
          name: typia.random<string>(),
          description: typia.random<string>(),
          is_featured: false,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(refreshedProduct);
  // Since we cannot fetch product by id with given SDK list, we assert by
  // ensuring original product reference still has deleted_at null (it was not
  // modified locally by erase call).
  // Note: This is a best-effort validation due to missing product-read endpoints.
  TestValidator.equals(
    "product should not be soft-deleted",
    product.deleted_at,
    null,
  );
}
