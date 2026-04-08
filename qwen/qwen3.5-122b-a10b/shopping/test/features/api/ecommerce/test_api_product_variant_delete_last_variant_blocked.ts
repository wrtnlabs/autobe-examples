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
 * Test that variant deletion is blocked when the variant is the last active variant on the product.
 *
 * Validates the last variant protection business rule that prevents products from becoming unavailable due to deletion. When a seller attempts to delete the only variant on a product, the system must reject the deletion request with a 409 Conflict error.
 *
 * 1. Register and authenticate a seller account with email verification.
 * 2. Create a parent product with name, description, category, and base price.
 * 3. Create a single variant on the product (making it the only variant).
 * 4. Attempt to delete the variant using the seller's authenticated connection.
 * 5. Validate that the deletion is blocked with 409 Conflict error.
 */
export async function test_api_product_variant_delete_last_variant_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create parent product (utility function handles valid category)
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create the only variant on the product
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(8).toUpperCase()}`,
          option_values: `color=${RandomGenerator.alphabets(5)};size=${RandomGenerator.alphabets(3)}`,
        } satisfies IEcommerceProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Attempt to delete the variant (should be blocked with 409 Conflict)
  await TestValidator.httpError(
    "last variant deletion blocked with 409 Conflict",
    409,
    async () => {
      await api.functional.ecommerce.seller.products.variants.erase(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      );
    },
  );
}
