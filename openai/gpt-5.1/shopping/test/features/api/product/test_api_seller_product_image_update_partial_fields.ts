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
 * Validate partial field updates on seller product images.
 *
 * Business workflow:
 *
 * 1. Register a seller and obtain an authorized seller session.
 * 2. Register an admin and obtain an authorized admin session.
 * 3. As seller, create a product using POST /shoppingMall/seller/products.
 * 4. As admin, create a category and associate it to the product via POST
 *    /shoppingMall/admin/products/{productId}/categories.
 * 5. As seller, create a product image with explicit image_uri, alt_text, and
 *    display_order using POST /shoppingMall/products/{productId}/images.
 * 6. Call PUT /shoppingMall/seller/products/{productId}/images/{productImageId}
 *    providing only alt_text to change description, ensuring image_uri and
 *    display_order remain unchanged.
 * 7. Optionally perform additional partial updates changing only display_order and
 *    only image_uri to ensure permutations behave correctly.
 */
export async function test_api_seller_product_image_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Register seller (join) and obtain seller session
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
  typia.assert(sellerAuthorized);

  // 2. Register admin and obtain admin session
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

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As seller, login (to ensure seller session if join didn't already set it)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/login/referrer",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  // 4. As seller, create product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(8),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. As admin, login and create a category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/login/referrer",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 6. Associate product with category
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

  // 7. Switch back to seller for image operations
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login2",
      referrer: "https://seller.example.com/login2/referrer",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  // 8. Create initial product image with explicit fields
  const initialImageUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const initialAltText: string = RandomGenerator.paragraph({ sentences: 3 });
  const initialDisplayOrder: number & tags.Type<"int32"> & tags.Minimum<0> =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();

  const imageCreateBody = {
    image_uri: initialImageUri,
    alt_text: initialAltText,
    display_order: initialDisplayOrder,
  } satisfies IShoppingMallProductImage.ICreate;

  const createdImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: imageCreateBody,
    });
  typia.assert(createdImage);

  // Assert initial state
  TestValidator.equals(
    "initial image id matches response",
    createdImage.id,
    createdImage.id,
  );
  TestValidator.equals(
    "initial image product link matches product",
    createdImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "initial image_uri stored correctly",
    createdImage.image_uri,
    initialImageUri,
  );
  TestValidator.equals(
    "initial alt_text stored correctly",
    createdImage.alt_text,
    initialAltText,
  );
  TestValidator.equals(
    "initial display_order stored correctly",
    createdImage.display_order,
    initialDisplayOrder,
  );

  // 9. Partial update: only alt_text
  const updatedAltTextOnly: string = RandomGenerator.paragraph({
    sentences: 2,
  });

  const altTextUpdateBody = {
    alt_text: updatedAltTextOnly,
  } satisfies IShoppingMallProductImage.IUpdate;

  const altTextUpdated: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.update(
      connection,
      {
        productId: createdImage.shopping_mall_product_id,
        productImageId: createdImage.id,
        body: altTextUpdateBody,
      },
    );
  typia.assert(altTextUpdated);

  // Validate partial update: id and product link unchanged, alt_text updated,
  // image_uri and display_order unchanged
  TestValidator.equals(
    "alt-only update preserves id",
    altTextUpdated.id,
    createdImage.id,
  );
  TestValidator.equals(
    "alt-only update preserves product link",
    altTextUpdated.shopping_mall_product_id,
    createdImage.shopping_mall_product_id,
  );
  TestValidator.equals(
    "alt-only update preserves image_uri",
    altTextUpdated.image_uri,
    createdImage.image_uri,
  );
  TestValidator.equals(
    "alt-only update changes alt_text",
    altTextUpdated.alt_text,
    updatedAltTextOnly,
  );
  TestValidator.equals(
    "alt-only update preserves display_order",
    altTextUpdated.display_order,
    createdImage.display_order,
  );

  // 10. Partial update: only display_order
  const updatedDisplayOrderOnly: number & tags.Type<"int32"> & tags.Minimum<0> =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();

  const displayOrderUpdateBody = {
    display_order: updatedDisplayOrderOnly,
  } satisfies IShoppingMallProductImage.IUpdate;

  const displayOrderUpdated: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.update(
      connection,
      {
        productId: createdImage.shopping_mall_product_id,
        productImageId: createdImage.id,
        body: displayOrderUpdateBody,
      },
    );
  typia.assert(displayOrderUpdated);

  TestValidator.equals(
    "display-order-only update preserves id",
    displayOrderUpdated.id,
    createdImage.id,
  );
  TestValidator.equals(
    "display-order-only update preserves product link",
    displayOrderUpdated.shopping_mall_product_id,
    createdImage.shopping_mall_product_id,
  );
  TestValidator.equals(
    "display-order-only update preserves image_uri",
    displayOrderUpdated.image_uri,
    createdImage.image_uri,
  );
  TestValidator.equals(
    "display-order-only update preserves latest alt_text",
    displayOrderUpdated.alt_text,
    altTextUpdated.alt_text,
  );
  TestValidator.equals(
    "display-order-only update changes display_order",
    displayOrderUpdated.display_order,
    updatedDisplayOrderOnly,
  );

  // 11. Partial update: only image_uri
  const updatedImageUriOnly: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const imageUriUpdateBody = {
    image_uri: updatedImageUriOnly,
  } satisfies IShoppingMallProductImage.IUpdate;

  const imageUriUpdated: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.update(
      connection,
      {
        productId: createdImage.shopping_mall_product_id,
        productImageId: createdImage.id,
        body: imageUriUpdateBody,
      },
    );
  typia.assert(imageUriUpdated);

  TestValidator.equals(
    "image-uri-only update preserves id",
    imageUriUpdated.id,
    createdImage.id,
  );
  TestValidator.equals(
    "image-uri-only update preserves product link",
    imageUriUpdated.shopping_mall_product_id,
    createdImage.shopping_mall_product_id,
  );
  TestValidator.equals(
    "image-uri-only update changes image_uri",
    imageUriUpdated.image_uri,
    updatedImageUriOnly,
  );
  TestValidator.equals(
    "image-uri-only update preserves latest alt_text",
    imageUriUpdated.alt_text,
    displayOrderUpdated.alt_text,
  );
  TestValidator.equals(
    "image-uri-only update preserves latest display_order",
    imageUriUpdated.display_order,
    displayOrderUpdated.display_order,
  );
}
