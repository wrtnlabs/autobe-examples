import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
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
 * Verify that deleting a product as an admin hides its images and category
 * links from their respective listing endpoints.
 *
 * Business flow:
 *
 * 1. Register a seller via /auth/seller/join so we can own a product.
 * 2. As the seller, create a product via /shoppingMall/seller/products.
 * 3. Attach at least one product image via
 *    /shoppingMall/products/{productId}/images.
 * 4. Register an admin via /auth/admin/join (this also authenticates as that
 *    admin).
 * 5. As admin, create a category via /shoppingMall/admin/categories.
 * 6. As admin, link the product to the category via
 *    /shoppingMall/admin/products/{productId}/categories.
 * 7. Before deletion, confirm that:
 *
 *    - Product images listing for this product returns the created image.
 *    - Product-category listing for this product returns the created link.
 * 8. Delete the product via /shoppingMall/admin/products/{productId}.
 * 9. After deletion, confirm that:
 *
 *    - Product images listing returns an empty page for this product.
 *    - Product-category listing returns an empty page for this product.
 */
export async function test_api_product_delete_cascades_to_product_images_and_categories_visibility(
  connection: api.IConnection,
) {
  // 1. Register seller (join)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. As seller, create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" + RandomGenerator.alphaNumeric(16),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Attach a product image using product-scoped images API
  const imageCreateBody = {
    image_uri:
      "https://cdn.example.com/images/" + RandomGenerator.alphaNumeric(16),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const productImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: imageCreateBody,
    });
  typia.assert(productImage);

  // 4. Register admin (join) – switches auth context to admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. As admin, create a category
  const categoryCreateBody = {
    parent_id: null,
    slug: "cat-" + RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 6. Create product-category link for this product and category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategoryLink);

  // 7. BEFORE deletion: verify images and categories listings show entries
  const imageListBefore: IPageIShoppingMallProductImage.ISummary =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        sortBy: "display_order",
        sortDirection: "asc",
        visibleOnly: true,
        primaryOnly: false,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(imageListBefore);

  TestValidator.predicate(
    "image listing before delete contains the created image",
    imageListBefore.data.some((img) => img.id === productImage.id),
  );

  const categoryListBefore: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          orderBy: "sort_order",
          orderDirection: "asc",
          categoryCodes: undefined,
          isPrimary: null,
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(categoryListBefore);

  TestValidator.predicate(
    "category listing before delete contains the created link",
    categoryListBefore.data.some((link) => link.id === productCategoryLink.id),
  );

  // Sanity check: ensure at least one image and at least one category link
  TestValidator.predicate(
    "at least one image exists before delete",
    imageListBefore.data.length >= 1,
  );
  TestValidator.predicate(
    "at least one category link exists before delete",
    categoryListBefore.data.length >= 1,
  );

  // 8. Delete the product via admin erase
  await api.functional.shoppingMall.admin.products.erase(connection, {
    productId: product.id as string & tags.Format<"uuid">,
  });

  // 9. AFTER deletion: listings should no longer expose images or category links
  const imageListAfter: IPageIShoppingMallProductImage.ISummary =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        sortBy: "display_order",
        sortDirection: "asc",
        visibleOnly: true,
        primaryOnly: false,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(imageListAfter);

  TestValidator.equals(
    "no images should be visible after product delete",
    imageListAfter.data,
    [],
  );

  const categoryListAfter: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.admin.products.categories.index(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          orderBy: "sort_order",
          orderDirection: "asc",
          categoryCodes: undefined,
          isPrimary: null,
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(categoryListAfter);

  TestValidator.equals(
    "no category links should be visible after product delete",
    categoryListAfter.data,
    [],
  );
}
