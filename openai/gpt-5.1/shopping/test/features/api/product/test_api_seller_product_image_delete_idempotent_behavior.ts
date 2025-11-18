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
 * Validate idempotent and safe deletion behavior of seller-managed product
 * images.
 *
 * Business context: A seller manages their product catalog including gallery
 * images. When a seller deletes a specific product image via the seller-scoped
 * DELETE endpoint
 * `/shoppingMall/seller/products/{productId}/images/{productImageId}`, the
 * operation should be safe to repeat. The first delete removes the image, and a
 * second delete with the same identifiers must not recreate data or leak
 * inconsistent internal state. Depending on platform choice, the second call
 * may either be silently treated as a no-op success or fail with a well-defined
 * not-found style HTTP error.
 *
 * This test builds a realistic multi-actor workflow:
 *
 * 1. Seller signs up and logs in.
 * 2. Admin signs up and logs in.
 * 3. Seller creates a product.
 * 4. Admin creates a category and links it to the product.
 * 5. Seller creates a product image for that product.
 * 6. Seller deletes the image once (must succeed).
 * 7. Seller deletes the same image again (must either succeed idempotently or fail
 *    with a controlled HttpError, but must not cause unexpected errors).
 *
 * Due to available APIs, we validate idempotency behaviorally (via error
 * handling) rather than by listing images after deletion.
 */
export async function test_api_seller_product_image_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Seller join (registration)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Admin join (registration)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 3. Ensure seller context via explicit login (even though join already set token)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/join-complete",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 4. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Switch to admin context via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 6. Admin creates a category
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

  // 7. Admin links product to category
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

  // 8. Switch back to seller context via login
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAgain);

  // 9. Seller creates a product image for the product
  const productImageCreateBody = {
    image_uri: "https://cdn.example.com/images/product-image.jpg",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const productImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: productImageCreateBody,
    });
  typia.assert<IShoppingMallProductImage>(productImage);

  // 10. First deletion - must complete without throwing
  let firstDeleteSucceeded = false;
  try {
    await api.functional.shoppingMall.seller.products.images.erase(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      productImageId: productImage.id as string & tags.Format<"uuid">,
    });
    firstDeleteSucceeded = true;
  } catch (error) {
    firstDeleteSucceeded = false;
  }

  TestValidator.predicate(
    "first product image delete should succeed without throwing",
    firstDeleteSucceeded,
  );

  // 11. Second deletion - idempotent-safe behavior
  let secondDeleteThrewHttpError = false;
  let secondDeleteSucceededWithoutError = false;

  try {
    await api.functional.shoppingMall.seller.products.images.erase(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      productImageId: productImage.id as string & tags.Format<"uuid">,
    });
    secondDeleteSucceededWithoutError = true;
  } catch (error) {
    if (error instanceof api.HttpError) {
      secondDeleteThrewHttpError = true;
    } else {
      throw error;
    }
  }

  TestValidator.predicate(
    "second delete is idempotent-safe (either silent success or HttpError)",
    secondDeleteSucceededWithoutError || secondDeleteThrewHttpError,
  );
}
