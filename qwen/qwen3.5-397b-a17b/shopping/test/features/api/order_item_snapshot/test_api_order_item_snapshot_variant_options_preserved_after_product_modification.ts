import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_option_definitions_option_values_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_option_values_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that variant options in an order item snapshot remain immutable and preserve
 * the original purchase-time values even after the seller modifies the product's
 * option definitions or option values.
 *
 * **Setup Prerequisites:**
 * 1. Seller registers and authenticates
 * 2. Seller creates a product with option definitions (e.g., 'Color')
 * 3. Seller creates option values (e.g., 'Red')
 * 4. Seller creates a variant with Color=Red
 * 5. Customer registers and authenticates
 * 6. Customer creates a shipping address
 * 7. Customer adds the variant to cart and places an order
 * 8. AFTER order placement, seller creates additional option value (e.g., 'Crimson')
 *
 * **Test Execution:**
 * 1. Seller calls the variant-options endpoint with the order item ID and snapshot ID
 * 2. System retrieves the snapshot which preserves the state at purchase time
 * 3. System returns the variant options as they existed when the order was placed
 *
 * **Validation Points:**
 * - Response shows the ORIGINAL option value name ('Red')
 * - Snapshot data is completely immutable and unaffected by subsequent product/option modifications
 * - The optionName and optionValue reflect the exact state at order placement time
 * - createdAt timestamp corresponds to the original order time
 * - The snapshot provides accurate historical record for dispute resolution
 */
export async function test_api_order_item_snapshot_variant_options_preserved_after_product_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a product
  // Note: category_id would need to reference an existing category in the system
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller creates option definition (Color)
  const optionDefinition =
    await api.functional.shoppingMall.seller.products.option_definitions.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: "Color",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(optionDefinition);
  // 4. Seller creates option value (Red) - this is the ORIGINAL value
  const originalOptionValueName = "Red";
  const optionValue =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.create(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          name: originalOptionValueName,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue);
  // 5. Seller creates variant with the original option value
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [optionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 7. Customer creates shipping address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 8. Customer adds variant to cart
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 9. Customer places order - this creates the immutable snapshot
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Extract order item from the order
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // The snapshot ID corresponds to the order item for the initial snapshot
  const snapshotId = orderItem.id;
  // 10. AFTER order placement, seller creates additional option value
  // This simulates the scenario where product options are modified after purchase
  const modifiedOptionValueName = "Crimson";
  const modifiedOptionValue =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.create(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          name: modifiedOptionValueName,
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(modifiedOptionValue);
  // 11. Test Execution: Seller retrieves variant options from the snapshot
  const variantOptionsResponse =
    await api.functional.shoppingMall.seller.orders.items.snapshots.variant_options.index(
      sellerConnection,
      {
        itemId: orderItem.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(variantOptionsResponse);
  // 12. Validation: Verify snapshot preserves original option value
  TestValidator.predicate(
    "snapshot has variant options",
    variantOptionsResponse.data.length > 0,
  );
  const snapshotVariantOption = variantOptionsResponse.data[0];
  typia.assert(snapshotVariantOption);
  // Verify the option definition name
  TestValidator.equals(
    "option definition name matches",
    snapshotVariantOption.optionName,
    "Color",
  );
  // CRITICAL: Verify the snapshot shows the ORIGINAL option value name
  TestValidator.equals(
    "option value name is ORIGINAL (Red)",
    snapshotVariantOption.optionValue,
    originalOptionValueName,
  );
  // Verify the snapshot timestamp corresponds to order time
  TestValidator.predicate(
    "snapshot created at matches order time",
    new Date(snapshotVariantOption.createdAt).getTime() <=
      new Date(order.ordered_at).getTime() + 1000,
  );
  // Verify snapshot immutability - the option value should NOT be the modified name
  TestValidator.notEquals(
    "option value is NOT the modified name (Crimson)",
    snapshotVariantOption.optionValue,
    modifiedOptionValueName,
  );
}
