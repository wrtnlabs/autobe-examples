import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that customers can only access snapshot options for their own orders, not other customers' orders.
 *
 * Validates the security requirement that order item snapshots are only accessible to the order owner. The test creates two separate member accounts, a seller account with a product variant, and has both customers place orders. Customer A successfully retrieves snapshot options for their own order, then attempts to access customer B's order snapshot options which should fail with 403 Forbidden.
 *
 * 1. Create two member accounts (customer A and customer B) via join.
 * 2. Create a seller account via join with a product and variant.
 * 3. Both customers place orders for the same product variant creating separate order item snapshots.
 * 4. Customer A retrieves snapshot options for their own order (should succeed with 200 OK).
 * 5. Customer A attempts to retrieve snapshot options for customer B's order using customer B's order ID (should fail with 403 Forbidden).
 * 6. Verify the authorization boundary prevents cross-customer data access.
 */
export async function test_api_order_item_snapshot_options_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two member customers (A and B)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_member_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerA);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_member_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerB);
  // 2. Create seller account with product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 3. Both customers place orders
  // Customer A adds to cart and places order
  await generate_random_shopping_mall_member_cart_items_create(
    customerAConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  const orderA = await generate_random_shopping_mall_member_orders_create(
    customerAConnection,
    {},
  );
  typia.assert(orderA);
  // Customer B adds to cart and places order
  await generate_random_shopping_mall_member_cart_items_create(
    customerBConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  const orderB = await generate_random_shopping_mall_member_orders_create(
    customerBConnection,
    {},
  );
  typia.assert(orderB);
  // Get order item IDs from orders
  const orderItemA = orderA.orderItems[0];
  const orderItemB = orderB.orderItems[0];
  // 4. Customer A retrieves snapshot options for their own order (should succeed)
  const optionsA =
    await api.functional.shoppingMall.member.orders.items.snapshot.options.at(
      customerAConnection,
      {
        orderId: orderA.id,
        orderItemId: orderItemA.id,
      },
    );
  typia.assert(optionsA);
  // 5. Customer A attempts to retrieve snapshot options for customer B's order (should fail with 403)
  await TestValidator.error(
    "Customer A cannot access Customer B's order snapshot options",
    async () => {
      await api.functional.shoppingMall.member.orders.items.snapshot.options.at(
        customerAConnection,
        {
          orderId: orderB.id,
          orderItemId: orderItemB.id,
        },
      );
    },
  );
}
