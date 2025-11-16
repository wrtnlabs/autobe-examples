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

export async function test_api_seller_product_primary_category_assignment(
  connection: api.IConnection,
) {
  // 1. Register a new seller (join) and obtain authenticated seller context
  const sellerJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create a product as this seller via seller-facing endpoint
  const productCode: string = `TEST-PROD-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code matches requested code",
    product.code,
    productCode,
  );
  TestValidator.equals(
    "product seller id matches joined seller",
    product.seller.id,
    sellerAuthorized.id,
  );

  // 3. Register a platform admin (join) to manage category trees
  const platformAdminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  // 4. Create a category tree as platform admin
  const categoryTreeCode = `TREE-${RandomGenerator.alphaNumeric(6)}`;

  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: "Primary Catalog Tree",
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
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  TestValidator.equals(
    "category tree code matches creation request",
    categoryTree.code,
    categoryTreeCode,
  );

  // 5. Create an active category in that tree as platform admin
  const categoryCode = `CAT-${RandomGenerator.alphaNumeric(6)}`;

  const categoryCreateBody = {
    code: categoryCode,
    name: "Primary Category",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode,
        body: categoryCreateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(category);

  TestValidator.equals(
    "category treeCode in category matches tree code",
    category.treeCode,
    categoryTree.code,
  );
  TestValidator.equals(
    "category code matches requested code",
    category.code,
    categoryCode,
  );
  TestValidator.predicate("category is active", category.isActive === true);

  // 6. Explicitly log back in as seller to ensure seller auth context
  const sellerLoginRequest = {
    email: sellerJoinRequest.email,
    password: sellerJoinRequest.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  TestValidator.equals(
    "logged-in seller id matches originally joined seller",
    sellerLoggedIn.id,
    sellerAuthorized.id,
  );

  // 7. Assign category as primary for the created product via seller endpoint
  const assignmentCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.seller.products.categories.create(
      connection,
      {
        productCode,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategoryAssignment>(assignment);

  // 8. Validate assignment relationships and primary flag
  TestValidator.equals(
    "assignment product id matches created product",
    assignment.product.id,
    product.id,
  );
  TestValidator.equals(
    "assignment product name matches created product name",
    assignment.product.name,
    product.name,
  );
  if (assignment.product.brand && product.brand) {
    TestValidator.equals(
      "assignment product brand id matches product brand id when present",
      assignment.product.brand.id,
      product.brand.id,
    );
  }

  TestValidator.equals(
    "assignment category id matches created category",
    assignment.category.id,
    category.id,
  );
  TestValidator.equals(
    "assignment category code matches created category code",
    assignment.category.code,
    category.code,
  );
  TestValidator.equals(
    "assignment category slug is non-empty string",
    typeof assignment.category.slug === "string" &&
      assignment.category.slug.length > 0,
    true,
  );
  TestValidator.equals(
    "assignment category belongs to created tree",
    assignment.category.categoryTree.code,
    categoryTree.code,
  );

  TestValidator.equals(
    "assignment is marked primary",
    assignment.is_primary,
    true,
  );
}
