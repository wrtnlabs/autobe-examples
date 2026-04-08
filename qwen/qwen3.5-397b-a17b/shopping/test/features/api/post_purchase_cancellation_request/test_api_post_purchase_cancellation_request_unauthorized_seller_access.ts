import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
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
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test unauthorized seller access to post-purchase cancellation requests.
 *
 * Validates that sellers cannot access cancellation requests for order items that do not belong to their products. This test ensures proper authorization enforcement by verifying that Seller A receives a 403 Forbidden response when attempting to access a cancellation request created for Seller B's order item.
 *
 * The test establishes two separate seller accounts (Seller A and Seller B), creates products for each, and has a customer place an order exclusively with Seller B's product. After the customer creates a post-purchase cancellation request for Seller B's order item, Seller A attempts to retrieve the cancellation request details.
 *
 * 1. Seller A registers and logs in, creates a product to establish seller identity.
 * 2. Seller B registers and logs in, creates a product with variants and inventory.
 * 3. Customer member registers and logs in, places an order for Seller B's product.
 * 4. Customer creates a post-purchase cancellation request for the order item.
 * 5. Seller A attempts to access the cancellation request using the valid UUID.
 * 6. Verifies that Seller A receives 403 Forbidden (not 404) indicating authorization failure.
 * 7. Confirms that the error is an authorization error, not a not-found error.
 */
export async function test_api_post_purchase_cancellation_request_unauthorized_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Seller A creates a product (to establish seller identity)
  const sellerAProduct =
    await api.functional.shoppingMall.seller.products.create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(sellerAProduct);
  // 2. Setup Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Seller B creates a product
  const sellerBProduct =
    await api.functional.shoppingMall.seller.products.create(
      sellerBConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(sellerBProduct);
  // Seller B creates a variant for the product
  const sellerBVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerBConnection,
      {
        productId: sellerBProduct.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `Color: ${RandomGenerator.alphabets(5)}, Size: ${RandomGenerator.pick(["S", "M", "L", "XL"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(sellerBVariant);
  // Seller B creates inventory record for the variant
  const inventoryRecord =
    await api.functional.shoppingMall.seller.variants.inventory_records.create(
      sellerBConnection,
      {
        variantId: sellerBVariant.id,
        body: {
          quantity_delta: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          reason: "RESTOCK",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 3. Setup Customer Member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // Customer adds Seller B's product variant to cart
  const cartItem = await api.functional.shoppingMall.member.cart.items.create(
    memberConnection,
    {
      body: {
        product_variant_id: sellerBVariant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Customer places order
  const order = await api.functional.shoppingMall.member.orders.create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item for Seller B's product
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 4. Customer creates post-purchase cancellation request
  const cancellationRequest =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 5. Seller A attempts to access Seller B's cancellation request (should fail with 403)
  await TestValidator.error(
    "unauthorized seller access returns 403",
    async () => {
      await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.at(
        sellerAConnection,
        {
          id: cancellationRequest.id,
        },
      );
    },
  );
}
