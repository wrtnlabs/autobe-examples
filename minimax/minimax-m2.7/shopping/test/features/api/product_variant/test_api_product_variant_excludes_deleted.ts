import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that soft-deleted variants are excluded from the variant list.
 *
 * Prerequisites:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product in a category
 * 3. Seller creates first variant with SKU 'VAR-ACTIVE-001' and options (color: Red)
 * 4. Seller creates second variant with SKU 'VAR-TO-DELETE-002' and options (color: Blue)
 * 5. Seller deletes the second variant (soft delete)
 *
 * Test Steps:
 * 1. As a guest/customer, call GET /ecommerceMall/products/{productId}/variants
 * 2. Verify response returns only 1 variant (the active one)
 * 3. Verify deleted variant with SKU 'VAR-TO-DELETE-002' is NOT in the response
 * 4. Confirm soft-deleted variants (deleted_at not null) are properly filtered out
 */
export async function test_api_product_variant_excludes_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    },
  });
  // Create authenticated connection with seller token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 2. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates first active variant with SKU 'VAR-ACTIVE-001' and options (color: Red)
  const activeVariant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      authenticatedSellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-ACTIVE-001",
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          option_values: [
            {
              key: "color",
              value: "Red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(activeVariant);
  // 4. Seller creates second variant with SKU 'VAR-TO-DELETE-002' and options (color: Blue)
  const variantToDelete =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      authenticatedSellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "VAR-TO-DELETE-002",
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          option_values: [
            {
              key: "color",
              value: "Blue",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variantToDelete);
  // 5. Seller deletes the second variant (soft delete)
  await api.functional.ecommerceMall.seller.products.variants.erase(
    authenticatedSellerConnection,
    {
      productId: product.id,
      variantId: variantToDelete.id,
    },
  );
  // 6. As a guest/customer, call GET /ecommerceMall/products/{productId}/variants
  // Using a fresh connection without authentication (guest/customer view)
  const guestConnection: api.IConnection = { host: connection.host };
  const variants = await api.functional.ecommerceMall.products.variants.list(
    guestConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(variants);
  // 7. Verify response returns only 1 variant (the active one)
  // The response is a single variant object (IEcommerceMallProductVariant), not an array
  TestValidator.equals(
    "should return only active variant",
    variants.sku_code,
    "VAR-ACTIVE-001",
  );
  TestValidator.equals(
    "deleted variant should not be returned",
    variants.sku_code !== "VAR-TO-DELETE-002",
    true,
  );
  // 8. Verify the deleted variant's SKU is NOT in the response
  TestValidator.predicate(
    "deleted variant excluded",
    variants.sku_code !== "VAR-TO-DELETE-002",
  );
}
