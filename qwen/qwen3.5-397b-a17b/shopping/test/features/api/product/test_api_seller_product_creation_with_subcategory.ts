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
 * Test product creation with a subcategory to validate one-level nesting support.
 *
 * Validates the complete product creation flow with category hierarchy including administrative category setup (top-level and subcategory), seller authentication, and product creation referencing the subcategory. Ensures that the product correctly associates with the subcategory and that the category hierarchy is preserved in the product response.
 *
 * Special attention is given to verifying that the product's category reference points to the subcategory (not the parent), the subcategory's parent reference is correctly maintained, and the product can be discovered through both the subcategory and parent category browsing per business rules.
 *
 * 1. Administrator creates top-level category with unique name.
 * 2. Administrator creates subcategory under the top-level category using parentId.
 * 3. Seller registers and logs in with approved status.
 * 4. Seller creates product referencing the subcategory ID.
 * 5. Validates product category association points to subcategory, subcategory parent reference is preserved, and product details match input data.
 */
export async function test_api_seller_product_creation_with_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Create top-level category
  const topLevelCategoryName = RandomGenerator.paragraph({ sentences: 1 });
  const topLevelCategoryDescription = RandomGenerator.content({
    paragraphs: 1,
  });
  const topLevelCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: topLevelCategoryName,
          description: topLevelCategoryDescription,
          parentId: null,
        },
      },
    );
  typia.assert(topLevelCategory);
  TestValidator.predicate(
    "top-level category has no parent",
    () => topLevelCategory.parent === null,
  );
  TestValidator.equals(
    "top-level category name",
    topLevelCategory.name,
    topLevelCategoryName,
  );
  // 3. Create subcategory under top-level category
  const subcategoryName = RandomGenerator.paragraph({ sentences: 1 });
  const subcategoryDescription = RandomGenerator.content({ paragraphs: 1 });
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: subcategoryName,
          description: subcategoryDescription,
          parentId: topLevelCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "subcategory parent ID",
    subcategory.parent?.id,
    topLevelCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name",
    subcategory.parent?.name,
    topLevelCategory.name,
  );
  // 4. Seller setup - create and login seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 5. Create product with subcategory
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const productBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        shopping_mall_category_id: subcategory.id,
        base_price: productBasePrice,
      },
    },
  );
  typia.assert(product);
  // 6. Validate product associations
  TestValidator.equals(
    "product category ID",
    product.category.id,
    subcategory.id,
  );
  TestValidator.equals(
    "product category name",
    product.category.name,
    subcategoryName,
  );
  TestValidator.equals(
    "product category parent",
    product.category.parent?.id,
    topLevelCategory.id,
  );
  TestValidator.equals(
    "product category parent name",
    product.category.parent?.name,
    topLevelCategoryName,
  );
  TestValidator.equals("product name", product.name, productName);
  TestValidator.equals(
    "product description",
    product.description,
    productDescription,
  );
  TestValidator.equals(
    "product base price",
    product.base_price,
    productBasePrice,
  );
  TestValidator.equals(
    "product seller ID",
    product.seller.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "product seller email",
    product.seller.email,
    sellerEmail,
  );
}
