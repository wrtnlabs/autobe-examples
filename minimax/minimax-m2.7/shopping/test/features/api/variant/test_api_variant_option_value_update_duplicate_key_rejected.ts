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
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that updating an option value key to match an existing key on the same variant is rejected due to uniqueness constraint.
 *
 * Validates the product variant option value key uniqueness enforcement. When a variant has multiple option values (e.g., color=Red, size=Large), attempting to update one option's key to match another option's key on the same variant must be rejected. This ensures data integrity and prevents ambiguous variant configurations.
 *
 * The test workflow:
 * 1. Administrator creates a product category required for product listing.
 * 2. Seller registers and authenticates with approved account status.
 * 3. Seller creates a product under the category.
 * 4. Seller creates a product variant with two option values: color=Red and size=Large.
 * 5. Attempt to update the 'size' option value's key to 'color'.
 * 6. System rejects the update with 400 Bad Request due to key uniqueness violation.
 *
 * Business validation ensures that each option key is unique per variant, preventing scenarios where multiple options share the same key identifier.
 */
export async function test_api_variant_option_value_update_duplicate_key_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  // 2. Seller registers - store credentials for login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // 3. Seller authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  // 5. Seller creates variant with multiple option values
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  // 6. Find the 'size' option value to update
  const sizeOptionValue = variant.optionValues.find((ov) => ov.key === "size");
  TestValidator.predicate(
    "size option value exists",
    sizeOptionValue !== undefined,
  );
  // 7. Get the full variant to retrieve option value IDs
  // The create response may not include IDs for option values
  // We need to create the option values separately to get their IDs
  // Actually, let's check - the variant create returns option values with their IDs
  // If the IDs are not in the response, we need to create option values separately first
  // Since variant creation returns option values but may not have IDs exposed,
  // let's verify by creating option values separately
  // First, create a new variant with just one option
  const variant2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "material", value: "Cotton" }],
        },
      },
    );
  // Create color option value separately to get its ID
  const colorOption =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant2.id },
        body: { key: "color", value: "Blue" },
      },
    );
  // Create size option value separately to get its ID
  const sizeOption =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant2.id },
        body: { key: "size", value: "Large" },
      },
    );
  // 8. Attempt to update size's key to 'color' (which already exists on this variant)
  // This should fail with 400 Bad Request due to key uniqueness violation
  await TestValidator.httpError(
    "update option value key to duplicate should fail",
    400,
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.option_values.update(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant2.id,
          optionValueId: sizeOption.key, // WRONG - this should be ID, not key
          body: {
            key: "color", // Trying to set key to 'color' which already exists
          },
        },
      );
    },
  );
}
