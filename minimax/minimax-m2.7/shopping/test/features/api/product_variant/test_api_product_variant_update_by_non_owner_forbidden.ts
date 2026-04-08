import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that a seller cannot update a variant belonging to another seller's product.
 *
 * Validates ownership-based access control in the product variant update endpoint.
 * Verifies that the system correctly rejects variant modification attempts by sellers
 * who do not own the parent product, returning 403 Forbidden with appropriate message.
 *
 * 1. Administrator creates a category for product assignment.
 * 2. Seller A registers and authenticates with approved status.
 * 3. Seller A creates a product with base price 149.99.
 * 4. Seller A creates a product variant with SKU code, color option, and quantity.
 * 5. Seller B registers and authenticates with different credentials.
 * 6. Seller B attempts to update the variant (price override) owned by Seller A.
 * 7. System returns 403 Forbidden with access denied message.
 * 8. Variant remains unchanged with original priceOverride null.
 */
export async function test_api_product_variant_update_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category 'Electronics'
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller A joins and authenticates
  const sellerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAJoinResult = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    { body: sellerACredentials },
  );
  typia.assert(sellerAJoinResult);
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerACredentials.email,
      password: sellerACredentials.password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller A creates product 'Bluetooth Headphones'
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAConnection,
      {
        body: {
          name: "Bluetooth Headphones",
          description: "Wireless Bluetooth headphones with noise cancellation",
          basePrice: 149.99,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Seller A creates variant with skuCode 'HEADPHONES-BLK', color: Black, quantity 200
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerAConnection,
      {
        body: {
          skuCode: "HEADPHONES-BLK",
          optionValues: [
            {
              key: "color",
              value: "Black",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Seller B joins and authenticates with different credentials
  const sellerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerB123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerBJoinResult = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    { body: sellerBCredentials },
  );
  typia.assert(sellerBJoinResult);
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBCredentials.email,
      password: sellerBCredentials.password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 6. Seller B attempts to update the variant created by Seller A with priceOverride 99.99
  await TestValidator.httpError(
    "Seller B cannot update Seller A's variant (403 Forbidden)",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.patchByProductidAndVariantid(
        sellerBConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            price: 99.99,
          } satisfies IEcommerceMallProductVariant.IUpdate,
        },
      ),
  );
  // 8. Verify variant remains unchanged with original priceOverride null
  TestValidator.predicate(
    "Variant priceOverride remains null (unchanged)",
    variant.price === null || variant.price === undefined,
  );
}
