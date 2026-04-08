import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test multi-seller order item access control and isolation.
 *
 * Validates that in a multi-seller order scenario, each seller can only retrieve their own order items and cannot access items belonging to other sellers. This test creates two seller accounts, each with their own product and variant, then has a customer place a single order containing items from both sellers.
 *
 * The test verifies that Seller A can successfully retrieve their order item and Seller B can successfully retrieve their order item, with both items belonging to the same parent order. Each seller's order item correctly references their respective product, variant, and seller information.
 *
 * 1. Register and approve two seller accounts (Seller A and Seller B).
 * 2. Seller A creates Product A with a variant.
 * 3. Seller B creates Product B with a variant.
 * 4. Register a customer member account.
 * 5. Customer places an order containing products from both sellers.
 * 6. Seller A retrieves their order item and validates the response.
 * 7. Seller B retrieves their order item and validates the response.
 * 8. Verify both order items belong to the same parent order.
 */
export async function test_api_order_item_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  // 2. Seller A creates Product A
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(productA);
  // 3. Seller A creates variant for Product A
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
      },
    );
  typia.assert(variantA);
  // 4. Register Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  // 5. Seller B creates Product B
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {},
  );
  typia.assert(productB);
  // 6. Seller B creates variant for Product B
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
      },
    );
  typia.assert(variantB);
  // 7. Register customer member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 8. Customer places order containing products from both sellers
  // Note: Order items are derived from cart, which would contain both products
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 9. Extract order items for each seller
  const sellerAOrderItem = order.orderItems.find(
    (item) => item.seller.id === sellerAAuth.id,
  );
  const sellerBOrderItem = order.orderItems.find(
    (item) => item.seller.id === sellerBAuth.id,
  );
  TestValidator.predicate(
    "Seller A has order item",
    () => sellerAOrderItem !== undefined,
  );
  TestValidator.predicate(
    "Seller B has order item",
    () => sellerBOrderItem !== undefined,
  );
  // 10. Seller A retrieves their order item
  const sellerAOrderItemDetail =
    await api.functional.shoppingMall.seller.seller.order_items.at(
      sellerAConnection,
      {
        orderItemId: sellerAOrderItem!.id,
      },
    );
  typia.assert(sellerAOrderItemDetail);
  // 11. Seller B retrieves their order item
  const sellerBOrderItemDetail =
    await api.functional.shoppingMall.seller.seller.order_items.at(
      sellerBConnection,
      {
        orderItemId: sellerBOrderItem!.id,
      },
    );
  typia.assert(sellerBOrderItemDetail);
  // 12. Validate Seller A's order item
  TestValidator.equals(
    "Seller A order item ID matches",
    sellerAOrderItemDetail.id,
    sellerAOrderItem!.id,
  );
  TestValidator.equals(
    "Seller A order item seller matches",
    sellerAOrderItemDetail.seller.id,
    sellerAAuth.id,
  );
  TestValidator.equals(
    "Seller A order item product matches",
    sellerAOrderItemDetail.product.id,
    productA.id,
  );
  TestValidator.equals(
    "Seller A order item variant matches",
    sellerAOrderItemDetail.productVariant.id,
    variantA.id,
  );
  // 13. Validate Seller B's order item
  TestValidator.equals(
    "Seller B order item ID matches",
    sellerBOrderItemDetail.id,
    sellerBOrderItem!.id,
  );
  TestValidator.equals(
    "Seller B order item seller matches",
    sellerBOrderItemDetail.seller.id,
    sellerBAuth.id,
  );
  TestValidator.equals(
    "Seller B order item product matches",
    sellerBOrderItemDetail.product.id,
    productB.id,
  );
  TestValidator.equals(
    "Seller B order item variant matches",
    sellerBOrderItemDetail.productVariant.id,
    variantB.id,
  );
  // 14. Validate both items belong to same order
  TestValidator.equals(
    "Both items share same order code",
    sellerAOrderItemDetail.order.code,
    sellerBOrderItemDetail.order.code,
  );
  TestValidator.equals(
    "Both items share same order ID",
    sellerAOrderItemDetail.order.id,
    sellerBOrderItemDetail.order.id,
  );
}
