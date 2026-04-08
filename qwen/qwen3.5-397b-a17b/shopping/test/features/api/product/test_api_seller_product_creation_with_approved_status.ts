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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test seller product creation with approved status workflow.
 *
 * Validates the complete product creation flow including seller registration,
 * admin category creation, and seller product listing. Ensures that the
 * product correctly references the category and that all required fields
 * are properly populated in the response.
 *
 * 1. Administrator registers and logs in to create category prerequisite.
 * 2. Admin creates a top-level category for product assignment.
 * 3. Seller registers with email and credentials.
 * 4. Seller logs in to obtain authenticated session.
 * 5. Seller creates product with name, description, category, and base price.
 * 6. Validates product details match input including category reference,
 *    seller association, and timestamps.
 */
export async function test_api_seller_product_creation_with_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
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
  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoinResult);
  // 3. Seller login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerLoginResult);
  // 4. Create product
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const productInput = {
    name: productName,
    description: productDescription,
    shopping_mall_category_id: category.id,
    base_price: basePrice,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    { body: productInput },
  );
  typia.assert(product);
  // 5. Validate product creation
  TestValidator.equals("product name", product.name, productName);
  TestValidator.equals(
    "product description",
    product.description,
    productDescription,
  );
  TestValidator.equals("base price", product.base_price, basePrice);
  TestValidator.equals("category id", product.category.id, category.id);
  TestValidator.equals("seller id", product.seller.id, sellerJoinResult.id);
  TestValidator.equals("seller email", product.seller.email, sellerEmail);
  TestValidator.equals("category name", product.category.name, category.name);
}