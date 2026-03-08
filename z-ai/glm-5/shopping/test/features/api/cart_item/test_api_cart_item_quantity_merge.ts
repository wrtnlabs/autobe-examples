import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_cart_item_quantity_merge(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - create seller, product, variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(1),
    },
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 3. Add inventory to variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity_change: 100,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. First cart item addition with quantity 2
  const firstAddQuantity = 2;
  const firstCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: firstAddQuantity,
        },
      },
    );
  typia.assert(firstCartItem);
  TestValidator.equals(
    "first add quantity",
    firstCartItem.quantity,
    firstAddQuantity,
  );
  const firstCreatedAt = firstCartItem.created_at;
  const firstUpdatedAt = firstCartItem.updated_at;
  const effectivePrice = variant.price ?? product.base_price;
  const expectedFirstSubtotal = firstAddQuantity * effectivePrice;
  TestValidator.equals(
    "first subtotal",
    firstCartItem.subtotal,
    expectedFirstSubtotal,
  );
  // 6. Second cart item addition with quantity 3 - should merge
  const secondAddQuantity = 3;
  const secondCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: secondAddQuantity,
        },
      },
    );
  typia.assert(secondCartItem);
  // 7. Verify merged quantity
  const expectedMergedQuantity = firstAddQuantity + secondAddQuantity;
  TestValidator.equals(
    "merged quantity",
    secondCartItem.quantity,
    expectedMergedQuantity,
  );
  // 8. Verify same cart item ID (not duplicated)
  TestValidator.equals(
    "same cart item ID",
    secondCartItem.id,
    firstCartItem.id,
  );
  // 9. Verify variant ID remains same
  TestValidator.equals("variant ID", secondCartItem.variant.id, variant.id);
  // 10. Verify subtotal reflects merged quantity
  const expectedMergedSubtotal = expectedMergedQuantity * effectivePrice;
  TestValidator.equals(
    "merged subtotal",
    secondCartItem.subtotal,
    expectedMergedSubtotal,
  );
  // 11. Verify updated_at was refreshed (greater than or equal to first updated_at)
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(secondCartItem.updated_at).getTime() >=
      new Date(firstUpdatedAt).getTime(),
  );
  // 12. Verify created_at remains same (original creation time)
  TestValidator.equals(
    "created_at unchanged",
    secondCartItem.created_at,
    firstCreatedAt,
  );
  // 13. Verify unavailable flag is false (stock available)
  TestValidator.equals("not unavailable", secondCartItem.unavailable, false);
  // 14. Verify stock_warning is false (quantity <= available stock)
  TestValidator.predicate(
    "no stock warning",
    expectedMergedQuantity <= secondCartItem.variant.stock_quantity,
  );
}
