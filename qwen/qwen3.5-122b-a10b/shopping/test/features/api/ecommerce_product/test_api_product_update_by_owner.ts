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
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test seller product update workflow with comprehensive validation.
 *
 * Validates that an authenticated seller can successfully update their own product listing with new information. The test verifies field persistence, timestamp updates, relationship preservation, and ownership validation.
 *
 * The workflow includes seller authentication, product creation, partial product update, and comprehensive response validation including snapshot creation verification through successful update response.
 *
 * 1. Seller registers and authenticates via authorize_seller_join utility.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Seller updates the product with modified name, description, and price.
 * 4. Validates updated product structure with typia.assert().
 * 5. Verifies updated_at timestamp is refreshed.
 * 6. Confirms all relationships (seller, category, variants, images) are preserved.
 * 7. Validates seller identity matches authenticated seller.
 * 8. Tests partial update (only some fields changed).
 */
export async function test_api_product_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Product Creation
  const originalProduct: IEcommerceProduct =
    await generate_random_ecommerce_seller_products_create(sellerConnection, {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    });
  typia.assert(originalProduct);
  // Store original updated_at for comparison
  const originalUpdatedAt: string = originalProduct.updatedAt;
  // 3. Product Update - Modify multiple fields
  const newPrice: number = Math.round(originalProduct.basePrice * 1.2);
  const updateBody: IEcommerceProduct.IUpdate = {
    name: RandomGenerator.name(4),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    base_price: newPrice,
  } satisfies IEcommerceProduct.IUpdate;
  const updatedProduct: IEcommerceProduct =
    await api.functional.ecommerce.seller.products.update(sellerConnection, {
      productId: originalProduct.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);
  // 4. Response Validation
  // Verify updated fields are persisted correctly
  TestValidator.equals("name updated", updatedProduct.name, updateBody.name!);
  TestValidator.equals(
    "description updated",
    updatedProduct.description,
    updateBody.description!,
  );
  TestValidator.equals(
    "base_price updated",
    updatedProduct.basePrice,
    updateBody.base_price!,
  );
  // Verify timestamp is refreshed
  TestValidator.predicate(
    "updated_at refreshed",
    updatedProduct.updatedAt > originalUpdatedAt,
  );
  // Verify relationships are preserved
  TestValidator.equals(
    "seller identity preserved",
    updatedProduct.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller shop name preserved",
    updatedProduct.seller.shop_name,
    originalProduct.seller.shop_name,
  );
  TestValidator.equals(
    "category preserved",
    updatedProduct.category.id,
    originalProduct.category.id,
  );
  // Verify product ID remains unchanged
  TestValidator.equals(
    "product ID unchanged",
    updatedProduct.id,
    originalProduct.id,
  );
  // Verify variants are preserved
  TestValidator.predicate(
    "variants array preserved",
    Array.isArray(updatedProduct.variants) &&
      updatedProduct.variants.length === originalProduct.variants.length,
  );
  // Verify images are preserved
  TestValidator.predicate(
    "images array preserved",
    Array.isArray(updatedProduct.productImages) &&
      updatedProduct.productImages.length ===
        originalProduct.productImages.length,
  );
  // Verify deleted_at is still null (product not deleted)
  TestValidator.predicate("product active", updatedProduct.deletedAt === null);
}
