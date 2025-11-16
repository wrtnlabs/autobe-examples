import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategoryAssignment";
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

export async function test_api_seller_product_category_assignments_list_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register seller (join)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  const sellerId: string & tags.Format<"uuid"> = sellerAuth.id;

  // 2. Register platform admin (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuth);

  // 3. As platform admin, create category tree
  const categoryTreeCode: string = RandomGenerator.alphaNumeric(10);
  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. As platform admin, create category in that tree
  const categoryCode: string = RandomGenerator.alphaNumeric(8);
  const categoryCreateBody = {
    code: categoryCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryCreateBody,
      },
    );
  typia.assert<IShoppingMallCategory>(category);

  // 5. As platform admin, create a product owned by the seller
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active", // any non-empty string is allowed
    is_multi_sku: false,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert<IShoppingMallProduct>(product);

  // 6. As platform admin, create product-category assignment (primary)
  const assignmentCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategoryAssignment>(assignment);

  // 7. Switch auth back to seller via login to ensure seller token context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAuth);

  // 8. Seller lists category assignments for their product with minimal request body
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallProductCategoryAssignment.IRequest;

  const pageResult: IPageIShoppingMallProductCategoryAssignment.ISummary =
    await api.functional.shoppingMall.seller.products.categories.index(
      connection,
      {
        productCode: product.code,
        body: listRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductCategoryAssignment.ISummary>(
    pageResult,
  );

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 9. Basic pagination and data assertions
  TestValidator.predicate(
    "pagination.limit should be >= 1",
    pagination.limit >= 1,
  );
  TestValidator.equals(
    "current page index should be 0 for first page",
    pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination.records should be >= 1",
    pagination.records >= 1,
  );
  TestValidator.predicate("data length should be >= 1", data.length >= 1);

  // Find assignment for created product
  const foundAssignment:
    | IShoppingMallProductCategoryAssignment.ISummary
    | undefined = data.find((item) => item.product.id === product.id);

  TestValidator.predicate(
    "at least one assignment should belong to created product",
    foundAssignment !== undefined,
  );

  if (foundAssignment !== undefined) {
    // product match
    TestValidator.equals(
      "found assignment product id matches created product",
      foundAssignment.product.id,
      product.id,
    );

    // category tree and category code match
    TestValidator.equals(
      "found assignment category tree code matches created tree",
      foundAssignment.category.categoryTree.code,
      categoryTree.code,
    );
    TestValidator.equals(
      "found assignment category code matches created category",
      foundAssignment.category.code,
      category.code,
    );

    // isPrimary flag consistent with created primary assignment
    TestValidator.equals(
      "found assignment isPrimary should be true for created primary assignment",
      foundAssignment.isPrimary,
      true,
    );
  }
}
