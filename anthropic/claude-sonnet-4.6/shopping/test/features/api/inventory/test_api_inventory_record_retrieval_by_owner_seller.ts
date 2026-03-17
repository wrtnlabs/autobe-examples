import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_retrieval_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin and create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category using admin connection
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics-" + RandomGenerator.alphaNumeric(8),
        description: "Electronic products",
      },
    },
  );
  typia.assert(category);
  // 3. Register a seller and create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create a product under the seller, assigned to the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product " + RandomGenerator.alphaNumeric(6),
        description: "A test product for inventory record retrieval",
        base_price: 100,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Add a variant to the product with a globally unique SKU
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: "SKU-ELEC-RED-LARGE-" + RandomGenerator.alphaNumeric(12),
          options: [
            {
              key: "color",
              value: "Red",
              sequence: 0,
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 6. Create a manual restock inventory record (quantity=50)
  const restockRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 50,
          note: "Received 50 units from supplier",
        },
      },
    );
  typia.assert(restockRecord);
  // Retrieve the restock record via GET
  const retrievedRestockRecord =
    await api.functional.shoppingMall.seller.products.variants.inventoryRecords.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        recordId: restockRecord.id,
      },
    );
  typia.assert(retrievedRestockRecord);
  // Validate the retrieved restock record fields
  TestValidator.equals(
    "restock record id matches",
    retrievedRestockRecord.id,
    restockRecord.id,
  );
  TestValidator.equals(
    "restock variantId matches",
    retrievedRestockRecord.variantId,
    variant.id,
  );
  TestValidator.equals(
    "restock quantity is 50",
    retrievedRestockRecord.quantity,
    50,
  );
  TestValidator.equals(
    "restock reasonType is manual_restock",
    retrievedRestockRecord.reasonType,
    "manual_restock",
  );
  TestValidator.equals(
    "restock note matches",
    retrievedRestockRecord.note,
    "Received 50 units from supplier",
  );
  // Additional edge case: Create a manual adjustment record (quantity=-10)
  // Stock is 50 after restock, so -10 adjustment is valid
  const adjustmentRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: -10,
          note: "Damaged goods removed",
        },
      },
    );
  typia.assert(adjustmentRecord);
  // Retrieve the adjustment record via GET
  const retrievedAdjustmentRecord =
    await api.functional.shoppingMall.seller.products.variants.inventoryRecords.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        recordId: adjustmentRecord.id,
      },
    );
  typia.assert(retrievedAdjustmentRecord);
  // Validate the retrieved adjustment record fields
  TestValidator.equals(
    "adjustment record id matches",
    retrievedAdjustmentRecord.id,
    adjustmentRecord.id,
  );
  TestValidator.equals(
    "adjustment variantId matches",
    retrievedAdjustmentRecord.variantId,
    variant.id,
  );
  TestValidator.equals(
    "adjustment quantity is -10",
    retrievedAdjustmentRecord.quantity,
    -10,
  );
  TestValidator.equals(
    "adjustment reasonType is manual_adjustment",
    retrievedAdjustmentRecord.reasonType,
    "manual_adjustment",
  );
  TestValidator.equals(
    "adjustment note matches",
    retrievedAdjustmentRecord.note,
    "Damaged goods removed",
  );
}
