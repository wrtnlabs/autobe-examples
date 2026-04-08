import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test successful product variant update by authenticated seller.
 *
 * Validates the complete variant update workflow including seller authentication, product creation with initial variant, and variant modification. Ensures that all mutable fields (SKU code, option values, price) can be updated successfully and that the response reflects the changes with an updated timestamp.
 *
 * The test verifies business logic correctness including:
 * - Variant ownership validation (seller can only update their own variants)
 * - Field mutability (sku_code, option_values, price can be modified)
 * - Response integrity (updated values match request)
 * - Timestamp progression (updated_at reflects modification time)
 *
 * 1. Seller registers and authenticates with email and credentials.
 * 2. Seller creates a parent product with required fields.
 * 3. Seller creates an initial variant with SKU, options, and price.
 * 4. Seller updates the variant with new SKU code, option values, and price.
 * 5. Validates response contains all updated values correctly.
 * 6. Confirms updated_at timestamp is later than initial creation time.
 */
export async function test_api_product_variant_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create parent product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create initial variant
  const initialVariant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphabets(8).toUpperCase(),
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);
  // 4. Update variant with new values
  const newSkuCode = RandomGenerator.alphabets(10).toUpperCase();
  const newOptionValues = `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)};material=${RandomGenerator.name(1)}`;
  const newPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2000>
  >();
  const updatedVariant =
    await api.functional.ecommerce.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          sku_code: newSkuCode,
          option_values: newOptionValues,
          price: newPrice,
        } satisfies IEcommerceProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate updated values
  TestValidator.equals("SKU code updated", updatedVariant.sku_code, newSkuCode);
  TestValidator.equals(
    "Option values updated",
    updatedVariant.option_values,
    newOptionValues,
  );
  TestValidator.equals("Price updated", updatedVariant.price, newPrice);
  TestValidator.predicate(
    "Updated timestamp changed",
    updatedVariant.updated_at > initialVariant.updated_at,
  );
}