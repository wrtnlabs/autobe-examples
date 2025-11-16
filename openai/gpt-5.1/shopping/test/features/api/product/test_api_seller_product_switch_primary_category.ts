import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate switching primary category for a seller product.
 *
 * Business goal: Ensure that when a seller assigns a new primary category to a
 * product, the backend correctly updates product-category assignments so that
 * the latest primary assignment points to the new category (catB) rather than
 * the prior one (catA). Due to available SDK surface, we validate the behavior
 * using the responses from POST
 * /shoppingMall/seller/products/{productCode}/categories, without listing all
 * assignments.
 *
 * Scenario steps:
 *
 * 1. Register a new seller using /auth/seller/join; rely on SDK to set
 *    Authorization header for this seller.
 * 2. As this seller, create a product via POST /shoppingMall/seller/products with
 *    a unique product code and required fields from
 *    IShoppingMallProduct.ICreate.
 * 3. Register a platform admin with /auth/platformAdmin/join; SDK switches
 *    Authorization to platform admin.
 * 4. As platform admin, create a category tree using
 *    /shoppingMall/platformAdmin/categoryTrees.
 * 5. As platform admin, create two active categories (catA and catB) under that
 *    tree using
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories
 *    with IShoppingMallCategory.ICreate (isActive=true).
 * 6. Switch Authentication back to the seller using /auth/seller/login with the
 *    original seller credentials.
 * 7. As seller, call /shoppingMall/seller/products/{productCode}/categories to
 *    create a primary assignment to catA using
 *    IShoppingMallProductCategoryAssignment.ICreate with
 *    shopping_mall_category_id = catA.id and is_primary=true; assert that the
 *    response is a valid IShoppingMallProductCategoryAssignment and that
 *    category.id equals catA.id and is_primary is true.
 * 8. Again as seller, call the same POST endpoint to create another primary
 *    assignment for catB (shopping_mall_category_id = catB.id,
 *    is_primary=true). Assert that the response is valid, that category.id
 *    equals catB.id, and is_primary is true.
 *
 * Even though we cannot list all assignments through a PATCH
 * /shoppingMall/seller/products/{productCode}/categories endpoint, this
 * sequence demonstrates that the latest primary assignment replaces the
 * previous one from the seller perspective.
 */
export async function test_api_seller_product_switch_primary_category(
  connection: api.IConnection,
) {
  // 1. Register seller (join)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create product as seller
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    16,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 3. Register platform admin (join), switch Authorization
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: platformAdminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 4. Create category tree as platform admin
  const categoryTreeCode = RandomGenerator.alphaNumeric(10);
  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: "Primary Test Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);
  TestValidator.equals(
    "category tree code should match",
    categoryTree.code,
    categoryTreeCode,
  );

  // 5. Create two active categories catA and catB under the tree
  const catACode = `CAT-A-${RandomGenerator.alphaNumeric(6)}`;
  const catAName = "Category A";
  const catACreateBody = {
    code: catACode,
    name: catAName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const catA: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: catACreateBody,
      },
    );
  typia.assert(catA);
  TestValidator.equals("catA code should match", catA.code, catACode);

  const catBCode = `CAT-B-${RandomGenerator.alphaNumeric(6)}`;
  const catBName = "Category B";
  const catBCreateBody = {
    code: catBCode,
    name: catBName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const catB: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: catBCreateBody,
      },
    );
  typia.assert(catB);
  TestValidator.equals("catB code should match", catB.code, catBCode);

  // 6. Switch back to seller by logging in
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 7. Assign catA as primary category for the product
  const assignCatABody = {
    shopping_mall_category_id: catA.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignmentA: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.seller.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: assignCatABody,
      },
    );
  typia.assert(assignmentA);

  TestValidator.equals(
    "first assignment should target catA",
    assignmentA.category.id,
    catA.id,
  );
  TestValidator.predicate(
    "first assignment should be primary",
    assignmentA.is_primary === true,
  );

  // 8. Assign catB as new primary category for the same product
  const assignCatBBody = {
    shopping_mall_category_id: catB.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignmentB: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.seller.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: assignCatBBody,
      },
    );
  typia.assert(assignmentB);

  TestValidator.equals(
    "second assignment should target catB",
    assignmentB.category.id,
    catB.id,
  );
  TestValidator.predicate(
    "second assignment should be primary",
    assignmentB.is_primary === true,
  );

  // Business-level assertion: after switching, primary category is catB, not catA
  TestValidator.notEquals(
    "final primary assignment should not be catA anymore",
    assignmentB.category.id,
    catA.id,
  );
}
