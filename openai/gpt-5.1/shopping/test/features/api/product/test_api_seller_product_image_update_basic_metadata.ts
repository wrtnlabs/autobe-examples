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

export async function test_api_seller_product_image_update_basic_metadata(
  connection: api.IConnection,
) {
  // 1. Seller joins (registration) and becomes authenticated
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller-portal.example.com/join",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create a minimal valid product as this seller
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "draft",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product should belong to seller from join",
    product.shopping_mall_seller_id,
    sellerAuthorized.id,
  );

  // 3. Admin joins and logs in, creates category, and links product
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin-portal.example.com/join",
    referrer: "https://admin-portal.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin-portal.example.com/login",
    referrer: "https://admin-portal.example.com/join-complete",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: null,
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

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
  typia.assert(productCategory);

  TestValidator.equals(
    "product-category link should target created product",
    productCategory.shopping_mall_product_id,
    product.id,
  );

  // 4. Switch back to seller context by logging in the seller explicitly
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller-portal.example.com/login",
    referrer: "https://seller-portal.example.com/join-complete",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  TestValidator.equals(
    "seller login should resolve the same seller id as join",
    sellerLogin.id,
    sellerAuthorized.id,
  );

  // 5. Create initial product image for this product
  const initialImageUri = "https://cdn.example.com/images/".concat(
    RandomGenerator.alphaNumeric(12),
  ) as string & tags.Format<"uri">;

  const initialImageCreateBody = {
    image_uri: initialImageUri,
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const createdImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: initialImageCreateBody,
    });
  typia.assert(createdImage);

  TestValidator.equals(
    "created image should reference product id",
    createdImage.shopping_mall_product_id,
    product.id,
  );

  // Snapshot original immutable and audit fields before update
  const originalImageId = createdImage.id;
  const originalProductId = createdImage.shopping_mall_product_id;
  const originalCreatedAt = createdImage.created_at;
  const originalUpdatedAt = createdImage.updated_at;

  // 6. Update product image metadata via seller endpoint with all mutable fields
  const updatedImageUri = "https://cdn.example.com/images/".concat(
    RandomGenerator.alphaNumeric(12),
  ) as string & tags.Format<"uri">;

  const updatedAltText = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDisplayOrder = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const updateBody = {
    image_uri: updatedImageUri,
    alt_text: updatedAltText,
    display_order: updatedDisplayOrder,
  } satisfies IShoppingMallProductImage.IUpdate;

  const updatedImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.update(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productImageId: createdImage.id as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);

  // 7. Validate identity fields remain unchanged
  TestValidator.equals(
    "updated image should keep same id",
    updatedImage.id,
    originalImageId,
  );

  TestValidator.equals(
    "updated image should keep same shopping_mall_product_id",
    updatedImage.shopping_mall_product_id,
    originalProductId,
  );

  TestValidator.equals(
    "updated image product id should equal parent product id",
    updatedImage.shopping_mall_product_id,
    product.id,
  );

  // Validate mutable fields reflect new values
  TestValidator.equals(
    "image_uri should be updated to new URI",
    updatedImage.image_uri,
    updatedImageUri,
  );

  TestValidator.equals(
    "alt_text should be updated to new description",
    updatedImage.alt_text,
    updatedAltText,
  );

  TestValidator.equals(
    "display_order should be updated to new value",
    updatedImage.display_order,
    updatedDisplayOrder,
  );

  // Validate audit timestamps
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedImage.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at should change after metadata update",
    updatedImage.updated_at,
    originalUpdatedAt,
  );

  const originalUpdatedAtDate = new Date(originalUpdatedAt);
  const newUpdatedAtDate = new Date(updatedImage.updated_at);

  TestValidator.predicate(
    "updated_at should be greater than previous updated_at",
    newUpdatedAtDate.getTime() > originalUpdatedAtDate.getTime(),
  );
}
