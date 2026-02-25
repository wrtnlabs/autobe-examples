import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_retrieval_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator connection and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  const category =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Setup seller connection and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        category_id: category.id,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create multiple variants for the product
  const variants = ArrayUtil.repeat(3, async (index) => {
    const variant =
      await generate_random_ecommerce_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            sku: `VARIANT-${index}-${RandomGenerator.alphaNumeric(6)}`,
            option_values: JSON.stringify({
              size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
              color: RandomGenerator.pick([
                "red",
                "blue",
                "green",
                "black",
              ] as const),
            }),
            price_override: typia.random<(number & tags.Minimum<0>) | null>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
            >(),
          } satisfies IEcommerceProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    return variant;
  });
  // 4. Retrieve product details using public endpoint (no authentication required)
  const retrievedProduct = await api.functional.ecommerce.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 5. Validate retrieved product structure and data
  TestValidator.equals("product ID matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "product base price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  // Validate seller information
  TestValidator.equals(
    "seller ID matches",
    retrievedProduct.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "seller shop name matches",
    retrievedProduct.seller.shop_name,
    product.seller.shop_name,
  );
  // Validate category information
  TestValidator.equals(
    "category ID matches",
    retrievedProduct.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedProduct.category.name,
    category.name,
  );
  // Validate timestamps
  TestValidator.predicate(
    "product has creation timestamp",
    typeof retrievedProduct.created_at === "string",
  );
  TestValidator.predicate(
    "product has update timestamp",
    typeof retrievedProduct.updated_at === "string",
  );
  // Validate product is active (not deleted)
  TestValidator.equals(
    "product is active (not deleted)",
    retrievedProduct.deleted_at,
    null,
  );
}
