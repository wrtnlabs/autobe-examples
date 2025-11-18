import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that a ShoppingMall product detail is publicly accessible with
 * proper category and seller context after seller and admin workflows.
 *
 * Business flow:
 *
 * 1. Seller joins the platform (POST /auth/seller/join).
 * 2. Seller creates a product (POST /shoppingMall/seller/products).
 * 3. Admin joins the platform (POST /auth/admin/join).
 * 4. Admin creates a category (POST /shoppingMall/admin/categories).
 * 5. Admin links the product to the category as primary (POST
 *    /shoppingMall/admin/products/{productId}/categories).
 * 6. Public user (no Authorization header) retrieves product detail (GET
 *    /shoppingMall/products/{productId}).
 * 7. Validate that detail matches created product data, includes seller summary,
 *    has active status and null deleted_at, and that invalid productId yields
 *    404.
 */
export async function test_api_product_detail_public_access_with_category_context(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  TestValidator.predicate(
    "seller join should produce token",
    sellerAuthorized.token.access.length > 0,
  );

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.example.com/product/main.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(createdProduct);

  TestValidator.equals(
    "created product code should match input",
    createdProduct.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "created product title should match input",
    createdProduct.title,
    productCreateBody.title,
  );
  TestValidator.equals(
    "created product summary should match input",
    createdProduct.summary,
    productCreateBody.summary,
  );
  TestValidator.equals(
    "created product description should match input",
    createdProduct.description,
    productCreateBody.description,
  );
  TestValidator.equals(
    "created product default_locale should match input",
    createdProduct.default_locale,
    productCreateBody.default_locale,
  );
  TestValidator.equals(
    "created product status should be active",
    createdProduct.status,
    "active",
  );
  TestValidator.equals(
    "created product deleted_at should be null",
    createdProduct.deleted_at ?? null,
    null,
  );

  // 3. Admin joins the platform
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  TestValidator.predicate(
    "admin join should produce token",
    adminAuthorized.token.access.length > 0,
  );

  // 4. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  TestValidator.equals(
    "created category slug should match input",
    createdCategory.slug,
    categoryCreateBody.slug,
  );
  TestValidator.equals(
    "created category status should be active",
    createdCategory.status,
    "active",
  );

  // 5. Admin links the product to the category as primary
  const productCategoryCreateBody = {
    shopping_mall_category_id: createdCategory.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const createdProductCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: createdProduct.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(createdProductCategory);

  TestValidator.equals(
    "linked productCategory product id should match created product",
    createdProductCategory.shopping_mall_product_id,
    createdProduct.id,
  );
  TestValidator.equals(
    "linked productCategory category id should match created category",
    createdProductCategory.shopping_mall_category_id,
    createdCategory.id,
  );
  TestValidator.equals(
    "linked productCategory should be primary",
    createdProductCategory.is_primary,
    true,
  );

  // 6. Public user retrieves product detail without authentication
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const publicProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(publicConnection, {
      productId: createdProduct.id as string & tags.Format<"uuid">,
    });
  typia.assert<IShoppingMallProduct>(publicProduct);

  // 7. Validate public product detail
  TestValidator.equals(
    "public product id should match created product id",
    publicProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "public product code should match created code",
    publicProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "public product title should match created title",
    publicProduct.title,
    createdProduct.title,
  );
  TestValidator.equals(
    "public product summary should match created summary",
    publicProduct.summary,
    createdProduct.summary,
  );
  TestValidator.equals(
    "public product description should match created description",
    publicProduct.description,
    createdProduct.description,
  );
  TestValidator.equals(
    "public product default_locale should match created default_locale",
    publicProduct.default_locale,
    createdProduct.default_locale,
  );
  TestValidator.equals(
    "public product status should remain active",
    publicProduct.status,
    "active",
  );
  TestValidator.equals(
    "public product deleted_at should be null",
    publicProduct.deleted_at ?? null,
    null,
  );

  // Validate seller summary linkage (if present)
  if (publicProduct.seller !== undefined) {
    TestValidator.equals(
      "public product seller id should match sellerAuthorized id",
      publicProduct.seller.id,
      sellerAuthorized.id,
    );
    TestValidator.equals(
      "public product seller email should match sellerAuthorized email",
      publicProduct.seller.email,
      sellerAuthorized.email,
    );
  }

  // 8. Verify 404 for non-existent productId on public endpoint
  const invalidProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Ensure invalidProductId is different from created product id
  TestValidator.predicate(
    "invalid product id should differ from created product id",
    invalidProductId !== createdProduct.id,
  );

  await TestValidator.error(
    "public GET on non-existent product should return 404",
    async () => {
      await api.functional.shoppingMall.products.at(publicConnection, {
        productId: invalidProductId,
      });
    },
  );
}
