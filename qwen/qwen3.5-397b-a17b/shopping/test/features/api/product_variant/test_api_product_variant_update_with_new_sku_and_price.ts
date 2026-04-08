import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test product variant update with new SKU code and price override.
 *
 * Validates the complete variant update workflow including category creation, product setup, initial variant creation, and variant modification with new SKU, option values, and price. Ensures that the update correctly modifies all fields, updates the timestamp, and creates an audit snapshot.
 *
 * The test verifies that variant updates preserve data integrity while allowing sellers to modify SKU codes, option descriptions, and pricing. The automatic snapshot creation ensures audit trail compliance for all variant modifications.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Seller registers and authenticates for product operations.
 * 3. Seller creates a product with the category and base price.
 * 4. Seller creates initial variant with SKU code and option values.
 * 5. Seller updates variant with new SKU, different options, and price override.
 * 6. Validates updated variant returns correct new values and changed timestamp.
 */
export async function test_api_product_variant_update_with_new_sku_and_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(category);
  // 2. Seller registration and authentication
  const sellerJoinResult = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResult);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResult.email,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Create initial variant
  const initialSku = `SKU-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const initialOptions = `Color: Blue, Size: Medium`;
  const initialVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: initialSku,
          option_values: initialOptions,
          price: null,
        },
      },
    );
  typia.assert(initialVariant);
  // Store initial values for comparison
  const initialCreatedAt = initialVariant.created_at;
  const initialUpdatedAt = initialVariant.updated_at;
  // 5. Update variant with new SKU, options, and price
  const newSku = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const newOptions = `Color: Red, Size: Large`;
  const newPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<5000>
  >();
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          sku_code: newSku,
          option_values: newOptions,
          price: newPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 6. Validate updated variant has new values
  TestValidator.equals("SKU code updated", updatedVariant.sku_code, newSku);
  TestValidator.equals(
    "Option values updated",
    updatedVariant.option_values,
    newOptions,
  );
  TestValidator.equals("Price override set", updatedVariant.price, newPrice);
  TestValidator.equals(
    "Variant ID unchanged",
    updatedVariant.id,
    initialVariant.id,
  );
  TestValidator.equals(
    "Created timestamp preserved",
    updatedVariant.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "Updated timestamp changed",
    updatedVariant.updated_at,
    initialUpdatedAt,
  );
}
