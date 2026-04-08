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
 * Test successful product variant update by a seller.
 *
 * Validates the complete variant update workflow including administrative category setup, seller authentication, product creation, initial variant creation, and variant modification. Ensures that the variant update correctly modifies SKU code, option values, and price override while preserving the variant's identity.
 *
 * Special attention is given to verifying that the updated_at timestamp changes after the update operation, and that the new values are correctly persisted and returned.
 *
 * 1. Administrator creates a category for product assignment.
 * 2. Seller registers with email and credentials.
 * 3. Seller logs in to obtain authenticated connection.
 * 4. Seller creates a product with base price and category.
 * 5. Seller creates initial variant on the product with SKU code, option values, and price.
 * 6. Seller updates the variant with new SKU code, option values, and price override.
 * 7. Validates the updated variant has correct new values and updated_at timestamp changed.
 */
export async function test_api_product_variant_update_success(
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
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers - store credentials for login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 3. Seller login with stored credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginResult);
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies Partial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 5. Seller creates initial variant
  const initialSku = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const initialOptionValues = `Color: Red, Size: Large`;
  const initialPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const initialVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: initialSku,
          option_values: initialOptionValues,
          price: initialPrice,
        } satisfies Partial<IShoppingMallProductVariant.ICreate>,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(initialVariant);
  // 6. Seller updates the variant
  const newSku = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const newOptionValues = `Color: Blue, Size: Medium`;
  const newPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const updatedVariant =
    await api.functional.shoppingMall.seller.variants.update(sellerConnection, {
      variantId: initialVariant.id,
      body: {
        sku_code: newSku,
        option_values: newOptionValues,
        price: newPrice,
      } satisfies IShoppingMallProductVariant.IUpdate,
    });
  typia.assert(updatedVariant);
  // 7. Validate the update
  TestValidator.equals("SKU code updated", updatedVariant.sku_code, newSku);
  TestValidator.equals(
    "Option values updated",
    updatedVariant.option_values,
    newOptionValues,
  );
  TestValidator.equals("Price updated", updatedVariant.price, newPrice);
  TestValidator.notEquals(
    "Updated timestamp changed",
    updatedVariant.updated_at,
    initialVariant.updated_at,
  );
  TestValidator.equals(
    "Variant ID preserved",
    updatedVariant.id,
    initialVariant.id,
  );
  TestValidator.equals(
    "Product reference preserved",
    updatedVariant.product.id,
    product.id,
  );
}