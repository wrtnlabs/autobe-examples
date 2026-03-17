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

export async function test_api_inventory_record_negative_adjustment_below_zero_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        description: "Test category for inventory test",
      },
    },
  );
  typia.assert(category);
  // 4. Seller creates a product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: 10000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates a variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: [
            {
              key: "color",
              value: "red",
              sequence: 0 as number & tags.Type<"int32">,
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 6. Test Step 1: Establish stock with quantity=10
  const initialRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 10 as number & tags.Type<"int32">,
          note: "Initial stock setup",
        },
      },
    );
  typia.assert(initialRecord);
  TestValidator.equals("initial quantity is 10", initialRecord.quantity, 10);
  TestValidator.equals(
    "initial note matches",
    initialRecord.note,
    "Initial stock setup",
  );
  TestValidator.equals(
    "initial reasonType is manual_restock",
    initialRecord.reasonType,
    "manual_restock",
  );
  // 7. Test Step 2: Over-subtraction should be rejected with 422
  await TestValidator.httpError(
    "over-subtraction below zero rejected with 422",
    422,
    async () => {
      await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
        sellerConnection,
        {
          params: { productId: product.id, variantId: variant.id },
          body: {
            quantity: -20 as number & tags.Type<"int32">,
            note: "Damaged goods",
          },
        },
      );
    },
  );
  // 8. Test Step 3: Exact boundary (-10) should be accepted
  const boundaryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: -10 as number & tags.Type<"int32">,
          note: "Full stock correction",
        },
      },
    );
  typia.assert(boundaryRecord);
  TestValidator.equals(
    "boundary quantity is -10",
    boundaryRecord.quantity,
    -10,
  );
  TestValidator.equals(
    "boundary reasonType is manual_adjustment",
    boundaryRecord.reasonType,
    "manual_adjustment",
  );
  TestValidator.equals(
    "boundary note matches",
    boundaryRecord.note,
    "Full stock correction",
  );
  // 9. Additional Validation: Verify initial record immutability (stored reference is unchanged)
  TestValidator.equals(
    "initial record quantity still 10",
    initialRecord.quantity,
    10,
  );
  TestValidator.equals(
    "initial record note unchanged",
    initialRecord.note,
    "Initial stock setup",
  );
  TestValidator.equals(
    "initial record reasonType unchanged",
    initialRecord.reasonType,
    "manual_restock",
  );
}
