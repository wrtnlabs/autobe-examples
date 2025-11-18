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
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Basic happy-path test for seller-driven product image creation.
 *
 * Business purpose:
 *
 * - Ensure that a seller who owns a product can attach an image to it via POST
 *   /shoppingMall/products/{productId}/images.
 * - Confirm that server-enforced association uses the productId from the path,
 *   not anything in the request body.
 * - Validate that server-managed metadata (id, timestamps, soft-delete flag) are
 *   populated as expected and that simple image metadata echoes the request.
 *
 * Steps:
 *
 * 1. Seller self-registers through /auth/seller/join and becomes authenticated
 *    (SDK writes Authorization header automatically).
 * 2. Authenticated seller calls /shoppingMall/seller/products with an
 *    IShoppingMallProduct.ICreate body to create a product.
 * 3. Admin context is established by /auth/admin/join, then admin creates a
 *    category via /shoppingMall/admin/categories, and finally links the product
 *    to that category with /shoppingMall/admin/products/{productId}/categories.
 *    This is optional for the image API but adds realistic catalog context.
 * 4. Seller logs in again via /auth/seller/login to ensure the connection’s
 *    Authorization header is set back to a seller token.
 * 5. Using api.functional.shoppingMall.products.images.create, the seller posts a
 *    new image for the product with an IShoppingMallProductImage.ICreate
 *    payload including image_uri, alt_text, and display_order=0.
 * 6. The test validates via typia.assert that the response is a proper
 *    IShoppingMallProductImage, then uses TestValidator to confirm:
 *
 *    - The image’s shopping_mall_product_id matches the created product.id.
 *    - Image_uri and alt_text echo the request values.
 *    - Display_order is 0.
 *    - Id is a non-empty UUID string.
 *    - Created_at and updated_at are non-empty ISO date-time strings.
 *    - Deleted_at is null or undefined (image is not soft-deleted).
 */
export async function test_api_product_image_creation_basic_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration) and becomes authenticated
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://seller-portal.example.com/join",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a product
  const productBody = {
    code: `CODE-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/products/primary.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Admin context: join, create category, and link product to category
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin-portal.example.com/join",
    referrer: "https://admin-portal.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 4. Switch back to seller: seller login
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller-portal.example.com/login",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Seller creates a new product image for the product
  const imageBody = {
    image_uri: "https://cdn.example.com/products/p1-main.jpg",
    alt_text: "Main product image",
    display_order: 0,
  } satisfies IShoppingMallProductImage.ICreate;

  const image: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: imageBody,
    });
  typia.assert(image);

  // 6. Business rule validations
  TestValidator.equals(
    "product image is linked to created product",
    image.shopping_mall_product_id,
    product.id,
  );

  TestValidator.equals(
    "image_uri echoes request",
    image.image_uri,
    imageBody.image_uri,
  );

  TestValidator.equals(
    "alt_text echoes request (nullable)",
    image.alt_text ?? null,
    imageBody.alt_text ?? null,
  );

  TestValidator.equals(
    "display_order is 0",
    image.display_order,
    imageBody.display_order,
  );

  // id should be a non-empty UUID string; typia.assert already validated
  TestValidator.predicate(
    "image id should be non-empty string",
    image.id.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty date-time string",
    image.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty date-time string",
    image.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at is null or undefined (active image)",
    image.deleted_at === null || image.deleted_at === undefined,
  );
}
