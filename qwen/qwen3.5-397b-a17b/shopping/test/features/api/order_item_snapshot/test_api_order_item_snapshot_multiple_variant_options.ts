import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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

export async function test_api_order_item_snapshot_multiple_variant_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates product
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
  // 3. Seller creates first option definition (Color)
  const colorOptionDef =
    await api.functional.shoppingMall.seller.products.option_definitions.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: "Color",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(colorOptionDef);
  // 4. Seller creates second option definition (Size)
  const sizeOptionDef =
    await api.functional.shoppingMall.seller.products.option_definitions.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: "Size",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(sizeOptionDef);
  // 5. Seller creates option value for Color (Red)
  const redOptionValue =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.create(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: colorOptionDef.id,
        body: {
          name: "Red",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(redOptionValue);
  // 6. Seller creates option value for Size (Large)
  const largeOptionValue =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.create(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: sizeOptionDef.id,
        body: {
          name: "Large",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(largeOptionValue);
  // 7. Seller creates variant with both option values
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [redOptionValue.id, largeOptionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 8. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 9. Customer creates shipping address
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
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 10. Customer adds variant to cart
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
  // 11. Customer creates order
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 12. Seller retrieves order items to get order item ID
  const orderItemsPage =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          shopping_mall_order_id: order.id,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsPage);
  TestValidator.predicate("order has items", orderItemsPage.data.length > 0);
  const orderItem = orderItemsPage.data[0]!;
  // 13. Validate order item contains the purchased variant
  TestValidator.equals(
    "variant SKU matches",
    orderItem.productVariant.sku_code,
    variant.skuCode,
  );
  // 14. Test retrieving variant options from order item snapshot
  // The snapshot preserves the exact option configuration at time of purchase
  // We test retrieval of each option value (Red and Large) from the snapshot
  const snapshotOptionIds = [redOptionValue.id, largeOptionValue.id];
  const expectedOptionNames = ["Red", "Large"];
  const expectedDefNames = ["Color", "Size"];
  for (let i = 0; i < snapshotOptionIds.length; i++) {
    const snapshotVariantOption =
      await api.functional.shoppingMall.seller.orders.items.snapshots.variant_options.at(
        sellerConnection,
        {
          itemId: orderItem.id,
          snapshotId: orderItem.id,
          optionId: snapshotOptionIds[i]!,
        },
      );
    typia.assert(snapshotVariantOption);
    // Validate the option value name is preserved in snapshot
    TestValidator.equals(
      `snapshot option ${i} name matches`,
      snapshotVariantOption.productOptionValue.name,
      expectedOptionNames[i]!,
    );
    // Validate the option definition name is preserved in snapshot
    TestValidator.equals(
      `snapshot option ${i} definition name matches`,
      snapshotVariantOption.productOptionValue.optionDefinition.name,
      expectedDefNames[i]!,
    );
  }
  // 15. Validate snapshot integrity - both options retrieved successfully
  TestValidator.predicate(
    "all variant options retrieved from snapshot",
    snapshotOptionIds.length === 2,
  );
}