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
 * Validate seller-side deletion of a product image in a realistic catalog
 * context.
 *
 * Business context:
 *
 * - Seller-owned products can have multiple gallery images stored in the
 *   `shopping_mall_product_images` table.
 * - Deletion is performed via the seller-focused endpoint DELETE
 *   /shoppingMall/seller/products/{productId}/images/{productImageId}.
 * - The underlying implementation is expected to enforce ownership and product
 *   state rules (for example legal holds), but such governance switches are not
 *   exposed through the current SDK.
 *
 * This test therefore focuses on a fully implementable workflow:
 *
 * 1. Register a seller and obtain authentication tokens.
 * 2. As the seller, create a product via POST /shoppingMall/seller/products.
 * 3. Register an admin account, login, create a category, and link it to the
 *    product to simulate realistic catalog setup.
 * 4. Re-authenticate as the seller.
 * 5. Create a product image via POST /shoppingMall/products/{productId}/images.
 * 6. Delete that image via DELETE
 *    /shoppingMall/seller/products/{productId}/images/{productImageId} and
 *    assert that the call succeeds.
 * 7. Attempt a second deletion of the same image and assert that an error is
 *    thrown, validating that the system does not silently accept stale delete
 *    requests.
 */
export async function test_api_seller_product_image_delete_legal_hold_or_status_restriction(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration) to obtain an authenticated seller context.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.console.local/join",
    referrer: "https://seller.console.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller creates a product via /shoppingMall/seller/products.
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(8),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/placeholder.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin joins and logs in, then creates a category and links it to the product.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedFromJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedFromJoin);

  // Explicit admin login to simulate normal multi-actor flows.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedFromLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedFromLogin);

  // Create a category.
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

  // Link the product to the created category.
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

  // 4. Re-authenticate as the seller to ensure seller context for image operations.
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.console.local/login",
    referrer: "https://seller.console.local/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedFromLogin);

  // 5. Seller creates a product image for the product.
  const productImageCreateBody = {
    image_uri: "https://cdn.example.com/images/product-main.png",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const productImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: productImageCreateBody,
    });
  typia.assert<IShoppingMallProductImage>(productImage);

  // 6. First deletion should succeed without throwing.
  await api.functional.shoppingMall.seller.products.images.erase(connection, {
    productId: product.id as string & tags.Format<"uuid">,
    productImageId: productImage.id as string & tags.Format<"uuid">,
  });

  // 7. Second deletion of the same image should result in an error, ensuring
  // that the endpoint does not silently accept stale delete requests.
  await TestValidator.error(
    "second deletion of same image should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          productImageId: productImage.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
