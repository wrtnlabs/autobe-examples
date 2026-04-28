import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_options_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

export async function test_api_product_variant_option_retrieve_successful(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful retrieval of a product variant option via the public hierarchical API.
   *
   * Validates the complete setup and retrieval workflow: seller authentication, product creation, variant creation with options, additional option creation, and public access to retrieve a specific variant option. Confirms that the hierarchical relationship integrity is maintained and that the option's attribute data is correctly preserved.
   *
   * Key validations include attribute key-value matching, timestamp presence, active status via null deletedAt, and proper population of the productVariant relation with the variant summary.
   *
   * 1. Seller authenticates via join to gain authenticated session for product operations.
   * 2. Seller creates a product with name, description, base price, and category assignment.
   * 3. Seller creates a product variant with SKU code and initial option configurations.
   * 4. Seller creates an additional option on the variant with a defined attribute key-value pair.
   * 5. Public retrieve call fetches the specific option via the hierarchical path (productId/variantId/optionId).
   * 6. Response is validated for correct attribute data, timestamps, active status, and variant relation.
   */
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create variant with initial options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Create additional option with explicit attribute key-value
  const attributeKey = "color";
  const attributeValue = "Red";
  const additionalOption =
    await generate_random_ecommerce_platform_seller_products_variants_options_create(
      sellerConnection,
      {
        params: { productId: product.id, skuCode: variant.sku_code },
        body: {
          attributeKey,
          attributeValue,
        } satisfies IEcommercePlatformProductVariantOption.ICreate,
      },
    );
  typia.assert(additionalOption);
  // 5. Public retrieve - no authentication needed
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedOption =
    await api.functional.ecommercePlatform.products.variants.options.at(
      publicConnection,
      {
        productId: product.id,
        variantId: variant.id,
        optionId: additionalOption.id,
      },
    );
  typia.assert(retrievedOption);
  // 6. Validate response data
  TestValidator.equals(
    "option id matches",
    retrievedOption.id,
    additionalOption.id,
  );
  TestValidator.equals(
    "attribute key matches",
    retrievedOption.attributeKey,
    attributeKey,
  );
  TestValidator.equals(
    "attribute value matches",
    retrievedOption.attributeValue,
    attributeValue,
  );
  TestValidator.predicate(
    "createdAt is present",
    retrievedOption.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is present",
    retrievedOption.updatedAt.length > 0,
  );
  TestValidator.equals(
    "deletedAt is null (active)",
    retrievedOption.deletedAt,
    null,
  );
  TestValidator.equals(
    "variant sku_code matches",
    retrievedOption.productVariant.sku_code,
    variant.sku_code,
  );
}
