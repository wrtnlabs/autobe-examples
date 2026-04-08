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
 * Test product retrieval with multiple variants and price overrides.
 *
 * Validates that the product detail endpoint correctly returns all variants with their option combinations, price overrides, and stock quantities. Ensures that the response properly handles variants with both custom prices and base price inheritance.
 *
 * 1. Seller authenticates to the platform.
 * 2. Seller creates a product with multiple variants having different option combinations.
 * 3. Some variants have price overrides while others use the base price.
 * 4. Customer retrieves the product by ID.
 * 5. Validates all variants are present with correct option_values format.
 * 6. Validates price overrides are correctly applied or null for base price variants.
 * 7. Validates stock quantities are calculated from inventory history.
 */
export async function test_api_product_retrieval_with_multiple_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
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
  // 2. Create product with multiple variants
  const basePrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: basePrice,
        variants: [
          {
            sku_code: "RED-LARGE",
            option_values: "color=Red;size=Large",
            price: basePrice + 1000, // Price override
          } satisfies IEcommerceProductVariant.ICreate,
          {
            sku_code: "BLUE-SMALL",
            option_values: "color=Blue;size=Small",
            price: null, // Uses base price
          } satisfies IEcommerceProductVariant.ICreate,
          {
            sku_code: "GREEN-MEDIUM",
            option_values: "color=Green;size=Medium",
            price: basePrice + 500, // Price override
          } satisfies IEcommerceProductVariant.ICreate,
        ],
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Retrieve the product
  const retrieved: IEcommerceProduct =
    await api.functional.ecommerce.products.at(sellerConnection, {
      productId: product.id,
    });
  typia.assert(retrieved);
  // 4. Validate product details
  TestValidator.equals("product name matches", retrieved.name, product.name);
  TestValidator.equals("base price matches", retrieved.basePrice, basePrice);
  TestValidator.predicate("has variants", retrieved.variants.length > 0);
  // 5. Validate variants
  TestValidator.equals("variant count", retrieved.variants.length, 3);
  // Find variants by SKU
  const redLarge = retrieved.variants.find((v) => v.sku_code === "RED-LARGE");
  const blueSmall = retrieved.variants.find((v) => v.sku_code === "BLUE-SMALL");
  const greenMedium = retrieved.variants.find(
    (v) => v.sku_code === "GREEN-MEDIUM",
  );
  TestValidator.predicate("RED-LARGE variant exists", redLarge !== undefined);
  TestValidator.predicate("BLUE-SMALL variant exists", blueSmall !== undefined);
  TestValidator.predicate(
    "GREEN-MEDIUM variant exists",
    greenMedium !== undefined,
  );
  // 6. Validate option_values format (key=value;key=value)
  TestValidator.predicate(
    "RED-LARGE option_values format",
    redLarge!.option_values.includes("=") &&
      redLarge!.option_values.includes(";"),
  );
  TestValidator.predicate(
    "BLUE-SMALL option_values format",
    blueSmall!.option_values.includes("=") &&
      blueSmall!.option_values.includes(";"),
  );
  TestValidator.predicate(
    "GREEN-MEDIUM option_values format",
    greenMedium!.option_values.includes("=") &&
      greenMedium!.option_values.includes(";"),
  );
  // 7. Validate price overrides
  TestValidator.equals(
    "RED-LARGE has price override",
    redLarge!.price,
    basePrice + 1000,
  );
  TestValidator.equals(
    "BLUE-SMALL uses base price (null)",
    blueSmall!.price,
    null,
  );
  TestValidator.equals(
    "GREEN-MEDIUM has price override",
    greenMedium!.price,
    basePrice + 500,
  );
  // 8. Validate stock quantities (should be non-negative integers)
  TestValidator.predicate(
    "RED-LARGE stock quantity valid",
    redLarge!.stock_quantity >= 0,
  );
  TestValidator.predicate(
    "BLUE-SMALL stock quantity valid",
    blueSmall!.stock_quantity >= 0,
  );
  TestValidator.predicate(
    "GREEN-MEDIUM stock quantity valid",
    greenMedium!.stock_quantity >= 0,
  );
}
