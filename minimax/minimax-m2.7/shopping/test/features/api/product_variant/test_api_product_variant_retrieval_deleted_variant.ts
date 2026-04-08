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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test retrieving a soft-deleted product variant returns 404 Not Found.
 *
 * Validates that when a seller deletes a product variant (soft delete), attempting
 * to retrieve that variant afterward returns HTTP 404 Not Found. This ensures that
 * soft-deleted variants are properly filtered out from queries and that the system
 * maintains consistent API behavior for non-existent resources.
 *
 * The test flow:
 * 1. Authenticate as seller and create a new product with a variant
 * 2. Soft-delete the variant via DELETE endpoint
 * 3. Attempt to retrieve the deleted variant via GET endpoint
 * 4. Verify HTTP 404 response is returned
 *
 * Business rules validated:
 * - Soft-deleted variants (deleted_at timestamp set) are not accessible
 * - Returns 404 for deleted variants to maintain API consistency
 * - The product and variant remain in database (soft delete only)
 */
export async function test_api_product_variant_retrieval_deleted_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "deleted-variant@test.com",
      password: "TestPass123!",
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  // 2. Create a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Limited Edition Shirt",
          description: "Limited edition collection",
        },
      },
    );
  typia.assert(product);
  // 3. Create a variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SHIRT-RED-M",
          optionValues: [
            { key: "Color", value: "Red" },
            { key: "Size", value: "M" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 4. Delete the variant (soft delete)
  await api.functional.ecommerceMall.seller.sellers.me.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 5. Attempt to retrieve deleted variant - expect 404
  await TestValidator.httpError(
    "deleted variant returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.getByProductidAndVariantid(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      ),
  );
}
