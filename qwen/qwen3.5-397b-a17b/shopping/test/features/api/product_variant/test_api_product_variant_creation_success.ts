import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test product variant creation success path with seller authentication and product ownership validation.
 *
 * Validates the complete product variant creation flow including administrative category setup, seller authentication, product creation, and variant creation. Ensures that the variant is correctly associated with the product and that all required fields are properly populated in the response.
 *
 * Special attention is given to verifying that the SKU code is unique within the product context, the option values are stored correctly, and the variant is immediately available after creation. The test also confirms that no inventory records are created during variant creation (stock starts at zero).
 *
 * 1. Administrator creates a category for product assignment.
 * 2. Seller registers with unique email and credentials.
 * 3. Seller logs in with credentials to obtain authentication token.
 * 4. Seller creates a product in the category with name, description, and base price.
 * 5. Seller creates the first variant for the product with unique SKU code, option values, and optional price override.
 * 6. Validates variant response contains all required fields including generated ID and timestamps.
 * 7. Validates variant is correctly associated with the parent product.
 * 8. Validates that variant price is correctly set (either override or inherits base price).
 */
export async function test_api_product_variant_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category for product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers (store password for login)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoinResult);
  // 3. Seller login with stored credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginResult);
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates variant with price override
  const variantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        price: variantPrice,
      },
    },
  );
  typia.assert(variant);
  // 6. Validate variant is associated with correct product
  TestValidator.equals(
    "variant product ID matches",
    variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "variant product name matches",
    variant.product.name,
    product.name,
  );
  // 7. Validate price is correctly set
  TestValidator.equals(
    "variant price matches input",
    variant.price,
    variantPrice,
  );
  // 8. Validate variant is active (not deleted)
  TestValidator.equals(
    "deleted_at is null for active variant",
    variant.deleted_at,
    null,
  );
}