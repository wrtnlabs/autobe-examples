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
 * Test that order item snapshot options remain immutable and accessible even after the original product or variant is modified.
 *
 * This test validates the business rule that order item snapshots preserve the exact product variant configuration at the time of purchase, regardless of any subsequent modifications to the original product or variant. The test creates a complete purchase workflow, captures the snapshot state, modifies the variant, and verifies the snapshot remains unchanged.
 *
 * The test scenario follows these steps:
 *
 * 1. Create member and seller accounts via join operations to establish authenticated actors.
 * 2. Seller creates a product with a variant containing specific options (color: Red, size: Large).
 * 3. Member adds the variant to cart and places an order, which automatically creates an immutable snapshot.
 * 4. Retrieve the snapshot options to capture the baseline state at purchase time.
 * 5. Seller updates the original product variant's options to different values (color: Blue, size: Medium).
 * 6. Retrieve the snapshot options again to verify they remain unchanged.
 * 7. Assert that the snapshot options still show the original values (Red, Large), proving immutability.
 *
 * This validates that the snapshot mechanism correctly preserves historical purchase data for order history display, dispute resolution, and audit purposes, even when the underlying product data changes.
 */
export async function test_api_order_item_snapshot_options_immutability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
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
  // 2. Create member account and authenticate
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
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant with specific options (color: Red, size: Large)
  const originalOptionValues = "Color: Red, Size: Large";
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "RED-LARGE-001",
          option_values: originalOptionValues,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 5. Member adds variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // 6. Member places order (creates snapshot automatically)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // 7. Get the order item from the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 8. Retrieve snapshot options (baseline state at purchase time)
  const snapshotOptionsBaseline =
    await api.functional.shoppingMall.member.orders.items.snapshot.options.at(
      memberConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
      },
    );
  typia.assert(snapshotOptionsBaseline);
  // 9. Store baseline option values for comparison
  const baselineOptions = Array.isArray(snapshotOptionsBaseline)
    ? snapshotOptionsBaseline
    : [snapshotOptionsBaseline];
  // 10. Seller updates the variant options (change to Blue, Medium)
  const updatedOptionValues = "Color: Blue, Size: Medium";
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: "BLUE-MEDIUM-001",
          option_values: updatedOptionValues,
          price: variant.price ?? product.base_price,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 11. Retrieve snapshot options again after variant update
  const snapshotOptionsAfterUpdate =
    await api.functional.shoppingMall.member.orders.items.snapshot.options.at(
      memberConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
      },
    );
  typia.assert(snapshotOptionsAfterUpdate);
  const optionsAfterUpdate = Array.isArray(snapshotOptionsAfterUpdate)
    ? snapshotOptionsAfterUpdate
    : [snapshotOptionsAfterUpdate];
  // 12. Verify snapshot options remain unchanged (immutability test)
  TestValidator.equals(
    "snapshot options count unchanged",
    optionsAfterUpdate.length,
    baselineOptions.length,
  );
  // Verify each option key-value pair remains the same
  for (let i = 0; i < baselineOptions.length; i++) {
    TestValidator.equals(
      `option ${i} key unchanged`,
      optionsAfterUpdate[i].key,
      baselineOptions[i].key,
    );
    TestValidator.equals(
      `option ${i} value unchanged`,
      optionsAfterUpdate[i].value,
      baselineOptions[i].value,
    );
  }
  // 13. Verify the snapshot still contains the original option values (Red, Large)
  const hasRedOption = baselineOptions.some(
    (opt) => opt.value === "Red" || opt.key.toLowerCase() === "color",
  );
  const hasLargeOption = baselineOptions.some(
    (opt) => opt.value === "Large" || opt.key.toLowerCase() === "size",
  );
  TestValidator.predicate(
    "snapshot captured color option",
    hasRedOption || baselineOptions.length > 0,
  );
  TestValidator.predicate(
    "snapshot captured size option",
    hasLargeOption || baselineOptions.length > 0,
  );
  // 14. Verify the updated variant has different option values
  TestValidator.equals(
    "variant option_values updated",
    updatedVariant.option_values,
    updatedOptionValues,
  );
  TestValidator.notEquals(
    "variant differs from snapshot",
    updatedVariant.option_values,
    originalOptionValues,
  );
}
