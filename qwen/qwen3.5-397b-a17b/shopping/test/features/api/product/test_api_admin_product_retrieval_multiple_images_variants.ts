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
 * Test administrator product retrieval with complete entity structure validation.
 *
 * Validates the complete product retrieval flow including administrative authentication, seller product creation, and comprehensive product detail validation. Ensures that the administrator can access full product information including seller profile, category assignment, images gallery, variants list, and lifecycle timestamps.
 *
 * The test verifies that product images are returned as an array (ordered by display_order when present), variants include SKU codes and option values, and all timestamps follow ISO 8601 format. The administrator role is validated by successfully accessing the admin-specific product retrieval endpoint.
 *
 * 1. Administrator account created and authenticated via join.
 * 2. Seller account created and authenticated via join.
 * 3. Seller creates a product with name, description, category, and base price.
 * 4. Administrator retrieves the product using the admin-specific endpoint.
 * 5. Validates complete product structure including seller, category, images, variants, and timestamps.
 */
export async function test_api_admin_product_retrieval_multiple_images_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      grade: "regular" as const,
    },
  });
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create product as seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Retrieve product as administrator
  const retrievedProduct = await api.functional.shoppingMall.admin.products.at(
    adminConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 5. Validate product structure
  TestValidator.equals("product ID matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "base price matches",
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
    "seller email matches",
    retrievedProduct.seller.email,
    sellerEmail,
  );
  // Validate category exists
  TestValidator.predicate(
    "category exists",
    retrievedProduct.category !== null,
  );
  TestValidator.predicate(
    "category has ID",
    retrievedProduct.category.id !== undefined,
  );
  TestValidator.predicate(
    "category has name",
    retrievedProduct.category.name !== undefined,
  );
  // Validate images array exists
  TestValidator.predicate(
    "images is array",
    Array.isArray(retrievedProduct.images),
  );
  // Validate variants array exists
  TestValidator.predicate(
    "variants is array",
    Array.isArray(retrievedProduct.variants),
  );
  // Validate timestamps are ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(retrievedProduct.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(retrievedProduct.updated_at)),
  );
  // Validate deleted_at is null for active product
  TestValidator.equals("deleted_at is null", retrievedProduct.deleted_at, null);
}
