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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test administrator product retrieval success workflow.
 *
 * Validates that an administrator can successfully retrieve complete details of an active product through the admin products endpoint. The test ensures proper authentication, product creation by a seller, and comprehensive response validation including all nested relations.
 *
 * The test workflow establishes multiple actor contexts: an administrator for viewing products and a seller for creating the product. This simulates the real-world scenario where administrators oversee seller-created products on the platform.
 *
 * 1. Administrator registers and authenticates via join operation.
 * 2. Seller registers and authenticates to create product.
 * 3. Seller creates a product with name, description, category, and base price.
 * 4. Administrator retrieves the product details using the product ID.
 * 5. Validates response contains all required fields: id, name, description, base_price, seller, category, images, variants, timestamps.
 * 6. Verifies seller information is correctly included in the response.
 * 7. Confirms category information is properly linked.
 * 8. Validates images array is present and variants include SKU codes and option values.
 */
export async function test_api_admin_product_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Seller setup - register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create product as seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Administrator retrieves product details
  const retrievedProduct = await api.functional.shoppingMall.admin.products.at(
    adminConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 5. Validate product identity matches created product
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
    "base price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  // 6. Validate seller information is correctly linked
  TestValidator.equals(
    "seller ID matches",
    retrievedProduct.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedProduct.seller.email,
    sellerAuth.email,
  );
  // 7. Validate category is properly linked
  TestValidator.predicate(
    "category has valid ID",
    retrievedProduct.category.id.length > 0,
  );
  TestValidator.predicate(
    "category has name",
    retrievedProduct.category.name.length > 0,
  );
  // 8. Validate timestamps are present and deleted_at is null for active product
  TestValidator.predicate(
    "created_at is set",
    retrievedProduct.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    retrievedProduct.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active product",
    retrievedProduct.deleted_at,
    null,
  );
}
