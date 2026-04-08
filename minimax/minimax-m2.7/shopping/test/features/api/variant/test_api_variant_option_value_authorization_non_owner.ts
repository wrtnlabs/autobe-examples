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
 * Test that a seller cannot add option values to a variant belonging to another seller.
 *
 * Validates the authorization boundary between sellers for variant option value management.
 * A seller should only be able to modify option values for variants that belong to
 * products they own. This test creates two separate seller accounts, has the first seller
 * create a product with a variant, and then verifies that the second seller receives a
 * 403 Forbidden response when attempting to add option values to the first seller's variant.
 *
 * 1. Admin creates a category (required for product creation).
 * 2. First seller registers and logs in.
 * 3. First seller creates a product using the admin-created category.
 * 4. First seller creates a variant for the product.
 * 5. Second seller registers and logs in (non-owner).
 * 6. Second seller attempts to add an option value to the first seller's variant.
 * 7. Verifies the response is 403 Forbidden, indicating proper authorization enforcement.
 */
export async function test_api_variant_option_value_authorization_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. First seller registers and logs in (owner)
  const ownerSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(ownerSellerConnection, {});
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.seller.login(ownerSellerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. First seller creates a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      ownerSellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. First seller creates a variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      ownerSellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Second seller registers and logs in (non-owner)
  const nonOwnerSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(nonOwnerSellerConnection, {});
  const nonOwnerEmail = typia.random<string & tags.Format<"email">>();
  const nonOwnerPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.seller.login(
    nonOwnerSellerConnection,
    {
      body: {
        email: nonOwnerEmail,
        password: nonOwnerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  // 6. Second seller attempts to add option value to first seller's variant
  // 7. Verify 403 Forbidden error
  await TestValidator.error(
    "non-owner cannot add option values to another seller's variant",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.option_values.create(
        nonOwnerSellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            key: "Color",
            value: "Red",
          } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
        },
      );
    },
  );
}
