import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test product variant retrieval when product exists but has no variants defined.
 *
 * Validates the business rule that products can be visible in the catalog even when they have no variants. Tests that the variants endpoint returns an empty paginated list instead of a 404 error for products without variants. This ensures products remain discoverable in search results while preventing purchase attempts for products without available variants.
 *
 * 1. Seller registers account and obtains authentication credentials
 * 2. Seller creates product with name, description, category, and base price
 * 3. Test retrieves variants list for the created product
 * 4. Assert response contains empty data array with pagination metadata
 * 5. Verify no HTTP error is returned (product exists, just no variants)
 */
export async function test_api_product_variant_empty_list_no_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create a product without variants
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Retrieve variants for product with no variants
  const variantsResponse =
    await api.functional.ecommerceMall.products.variants.list(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(variantsResponse);
  // 4. Validate empty variants list structure
  TestValidator.equals(
    "variants data array empty",
    variantsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current",
    variantsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    variantsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records",
    variantsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages",
    variantsResponse.pagination.pages,
    0,
  );
}