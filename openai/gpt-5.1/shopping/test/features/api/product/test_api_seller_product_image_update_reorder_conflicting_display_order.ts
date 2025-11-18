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
 * Validate that reordering a seller product image into a conflicting display
 * order fails with a business-level conflict.
 *
 * Business context: A seller manages gallery images for a product. Each image
 * has a display_order, and the schema enforces a uniqueness constraint on
 * (shopping_mall_product_id, display_order) so that no two images of the same
 * product share the same position in the gallery. When the seller attempts to
 * move one image into a position already occupied by another image of the same
 * product, the system must reject the update instead of creating duplicate
 * display_order values.
 *
 * End-to-end workflow:
 *
 * 1. Register a seller via /auth/seller/join and obtain an authorized seller
 *    context (the SDK manages the Authorization header).
 * 2. As the seller, create a product via /shoppingMall/seller/products using
 *    IShoppingMallProduct.ICreate.
 * 3. Register an admin via /auth/admin/join and obtain an authorized admin
 *    context.
 * 4. As the admin, create a catalog category via /shoppingMall/admin/categories
 *    with IShoppingMallCategory.ICreate.
 * 5. Still as the admin, associate the category with the seller’s product via
 *    /shoppingMall/admin/products/{productId}/categories using
 *    IShoppingMallProductCategory.ICreate, so the product is properly wired
 *    into the taxonomy.
 * 6. Switch back to the seller by logging in via /auth/seller/login.
 * 7. As the seller, create two product images for the same product using
 *    /shoppingMall/products/{productId}/images:
 *
 *    - First image: display_order = 0.
 *    - Second image: display_order = 1.
 * 8. Attempt to update the second image via PUT
 *    /shoppingMall/seller/products/{productId}/images/{productImageId} so that
 *    its display_order becomes 0, intentionally colliding with the first
 *    image’s position. Only display_order is changed; other fields are left
 *    untouched.
 * 9. Use TestValidator.error to assert that the update call fails with some
 *    HttpError (conflict-style error), without asserting specific HTTP status
 *    codes or error payload structure.
 *
 * The test focuses on business-rule enforcement of the unique (product,
 * display_order) constraint and ensures that a conflicting reordering attempt
 * does not succeed.
 */
export async function test_api_seller_product_image_update_reorder_conflicting_display_order(
  connection: api.IConnection,
) {
  // 1. Seller join (also authenticates seller via SDK header management)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create a product as this seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Admin join (also authenticates admin)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Create a category as admin
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 5. Associate the category to the product as admin
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

  // 6. Re-login as seller to ensure seller auth context if needed
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/catalog",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 7. Create two product images under the same product
  const firstImageBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0,
  } satisfies IShoppingMallProductImage.ICreate;

  const firstImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: firstImageBody,
    });
  typia.assert(firstImage);

  const secondImageBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallProductImage.ICreate;

  const secondImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: secondImageBody,
    });
  typia.assert(secondImage);

  // 8. Attempt to update the second image to a conflicting display_order (0)
  const conflictingUpdateBody = {
    display_order: 0,
  } satisfies IShoppingMallProductImage.IUpdate;

  await TestValidator.error(
    "updating product image to conflicting display_order must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.images.update(
        connection,
        {
          productId: product.id,
          productImageId: secondImage.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );
}
