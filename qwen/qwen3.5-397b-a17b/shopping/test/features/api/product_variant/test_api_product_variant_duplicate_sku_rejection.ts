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
 * Test business rule enforcement for duplicate SKU codes within the same product.
 *
 * An approved seller attempts to create a second variant with the same SKU code as an existing variant on their product. The test validates: (1) First variant creation succeeds, (2) Second variant creation with duplicate SKU is rejected with 409 Conflict, (3) Error message indicates SKU code uniqueness constraint, (4) Only one variant with the given SKU code exists after the failed attempt. This tests the business rule that SKU codes must be unique within a product context, preventing inventory and order tracking conflicts.
 *
 * 1. Administrator creates a category for product assignment.
 * 2. Seller registers with credentials and logs in to obtain authenticated connection.
 * 3. Seller creates a product in the created category.
 * 4. Seller creates first variant with a specific SKU code - should succeed.
 * 5. Seller attempts to create second variant with same SKU code - should fail with 409 Conflict.
 * 6. Validate error response indicates duplicate SKU rejection.
 */
export async function test_api_product_variant_duplicate_sku_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registration with known password
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Seller login with credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Create first variant with specific SKU code
  const skuCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const firstVariant =
    await generate_random_shopping_mall_seller_variants_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          sku_code: skuCode,
          option_values: "Color: Red, Size: Large",
        },
      },
    );
  typia.assert(firstVariant);
  // 5. Attempt to create second variant with same SKU code - should fail with 409
  await TestValidator.httpError(
    "duplicate SKU code rejected with 409 Conflict",
    409,
    async () => {
      await api.functional.shoppingMall.seller.variants.create(
        sellerConnection,
        {
          body: {
            shopping_mall_product_id: product.id,
            sku_code: skuCode,
            option_values: "Color: Blue, Size: Large",
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );
}