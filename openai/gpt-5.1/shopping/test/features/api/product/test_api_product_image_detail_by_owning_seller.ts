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
 * Verify that an authenticated seller can retrieve detailed information for a
 * specific image belonging to their own product.
 *
 * Business context
 *
 * - Sellers own products they create via the seller product creation endpoint.
 * - Additional product images are stored as separate records tied to the product
 *   (shopping_mall_product_images).
 * - The GET image-detail endpoint returns the canonical metadata for a single
 *   image for a given product.
 * - Catalog context (categories) is administered separately by admins but is
 *   often present in realistic flows; we set it up to reflect this, while not
 *   relying on it for the image-detail behavior itself.
 *
 * Flow
 *
 * 1. Register a seller (join) and obtain an authenticated seller context.
 * 2. Using this seller, create a product using seller products.create.
 * 3. Register and login an admin, then: 3-1. Create a category. 3-2. Associate the
 *    created category with the product via admin product-categories.create.
 * 4. Optionally log back in as the seller to emphasize that subsequent operations
 *    are done in seller context (SDK tracks tokens via connection).
 * 5. Create a product image for the product with display_order = 0.
 * 6. Fetch the product image details via GET products.images.at using the
 *    productId and productImageId from previous responses.
 * 7. Assert that the response is a valid IShoppingMallProductImage and that
 *    identifiers and key metadata match the created image.
 *
 * Validation focus
 *
 * - Ownership linkage: image.shopping_mall_product_id must equal product.id.
 * - Identity: response.id must equal the created image id.
 * - Metadata integrity: image_uri and display_order must match creation payload;
 *   deleted_at must be null to indicate an active image.
 */
export async function test_api_product_image_detail_by_owning_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration (join) and implicit authentication
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Product creation by the seller
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin registration and login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoinResult);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Category creation and product-category association
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  TestValidator.equals(
    "product-category product id should match product.id",
    productCategory.shopping_mall_product_id,
    product.id,
  );

  // 5. Switch back to seller context (login)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedAgain);

  // 6. Create a product image for the product
  const imageUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const productImageCreateBody = {
    image_uri: imageUri,
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const createdImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: productImageCreateBody,
    });
  typia.assert<IShoppingMallProductImage>(createdImage);

  TestValidator.equals(
    "created image product id matches parent product.id",
    createdImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "created image uri matches request",
    createdImage.image_uri,
    imageUri,
  );
  TestValidator.equals(
    "created image display_order is 0",
    createdImage.display_order,
    0,
  );

  // 7. Retrieve the product image details via GET
  const fetchedImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.at(connection, {
      productId: product.id,
      productImageId: createdImage.id,
    });
  typia.assert<IShoppingMallProductImage>(fetchedImage);

  // 8. Business assertions
  TestValidator.equals(
    "fetched image id equals created image id",
    fetchedImage.id,
    createdImage.id,
  );
  TestValidator.equals(
    "fetched image product id equals parent product id",
    fetchedImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "fetched image uri matches created image uri",
    fetchedImage.image_uri,
    imageUri,
  );
  TestValidator.equals(
    "fetched image display_order remains 0",
    fetchedImage.display_order,
    0,
  );
  TestValidator.equals(
    "fetched image deleted_at is null (active image)",
    fetchedImage.deleted_at,
    null,
  );
}
