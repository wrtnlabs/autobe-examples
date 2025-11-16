import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductMedia";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate catalog product details handling of product status changes and
 * deletion.
 *
 * Business goals:
 *
 * - Ensure GET /shoppingMall/catalog/products/{productCode}/details reflects the
 *   current lifecycle status of a product created by a seller.
 * - Verify that status changes performed by a platform administrator are visible
 *   through the catalog details endpoint.
 * - Confirm that after a platform-admin-triggered erase, the catalog details
 *   endpoint no longer returns the product and instead fails with an error.
 *
 * Scenario steps:
 *
 * 1. Register a seller account and obtain an authenticated seller session.
 * 2. Register a platform admin account and obtain an authenticated admin session.
 * 3. As seller, create a new product with status "active" and a deterministic
 *    business code.
 * 4. As platform admin, create a category tree and category, then assign the
 *    product to that category to simulate realistic catalog context. Also, as
 *    seller, attach one media item to the product.
 * 5. Call catalog.products.details.at for the product code and assert:
 *
 *    - The response is a valid IShoppingMallProduct.
 *    - Status is "active".
 *    - Deleted_at is null or undefined (i.e., product is not logically deleted).
 * 6. As platform admin, update the product status to a non-active value such as
 *    "inactive" using platformAdmin.products.update.
 * 7. Call catalog.products.details.at again and assert:
 *
 *    - Status is now "inactive".
 *    - Deleted_at remains null or undefined.
 * 8. As platform admin, erase the product via platformAdmin.products.erase.
 * 9. Call catalog.products.details.at once more and assert that the call fails by
 *    using TestValidator.error (without asserting any particular HTTP status).
 * 10. Across the successful details responses, check that we never observe an
 *     inconsistent combination such as status "active" combined with a non-null
 *     deleted_at.
 */
export async function test_api_catalog_product_details_respects_soft_deletion_and_status(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a seller
  const sellerJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // Make sure seller session is active implicitly via SDK header handling

  // 2. Register and authenticate a platform admin
  const platformAdminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  // 3. Switch back to seller context by logging in with seller credentials
  const sellerLoginRequest = {
    email: sellerJoinRequest.email,
    password: sellerJoinRequest.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 4. As platform admin, create a brand for richer product context
  const platformAdminLoginRequest = {
    email: platformAdminJoinRequest.email,
    password: platformAdminJoinRequest.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLoggedIn);

  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri:
      "https://cdn.example.com/logo/" +
      RandomGenerator.alphaNumeric(12) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 5. Switch back to seller context to create a product owned by this seller
  const sellerRelogged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerRelogged);

  const productCode: string & tags.MinLength<1> = ("prd-" +
    RandomGenerator.alphaNumeric(10)) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active", // deterministic for assertions
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/product/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(createdProduct);

  TestValidator.equals(
    "created product code matches requested code",
    createdProduct.code,
    productCode,
  );
  TestValidator.equals(
    "created product status is active",
    createdProduct.status,
    "active",
  );

  // 6. As platform admin, create a category tree and category
  const platformAdminRelogged: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminRelogged);

  const categoryTreeCode = "tree-" + RandomGenerator.alphaNumeric(8);

  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: "Main Catalog " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  const categoryCreateBody = {
    code: "cat-" + RandomGenerator.alphaNumeric(6),
    name: "Category " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
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

  // 7. Assign the product to the category (as platform admin)
  const categoryAssignmentBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: productCode,
        body: categoryAssignmentBody,
      },
    );
  typia.assert<IShoppingMallProductCategoryAssignment>(assignment);

  // 8. Switch to seller again and attach one media item
  const sellerForMedia: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerForMedia);

  const mediaCreateBody = {
    uri:
      "https://cdn.example.com/product/" +
      RandomGenerator.alphaNumeric(16) +
      "/media.jpg",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const media: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: productCode,
      body: mediaCreateBody,
    });
  typia.assert<IShoppingMallProductMedia>(media);

  // Helper to assert lifecycle invariants on product
  const assertProductLifecycle = (
    titlePrefix: string,
    product: IShoppingMallProduct,
  ) => {
    TestValidator.predicate(
      `${titlePrefix}: deleted_at must not be non-null when status is active`,
      !(
        product.status === "active" &&
        product.deleted_at !== null &&
        product.deleted_at !== undefined
      ),
    );
  };

  // 9. First catalog details fetch (should reflect active, not deleted)
  const detailsActive: IShoppingMallProduct =
    await api.functional.shoppingMall.catalog.products.details.at(connection, {
      productCode: productCode,
    });
  typia.assert<IShoppingMallProduct>(detailsActive);

  TestValidator.equals(
    "details (initial) product code matches",
    detailsActive.code,
    productCode,
  );
  TestValidator.equals(
    "details (initial) status is active",
    detailsActive.status,
    "active",
  );
  TestValidator.predicate(
    "details (initial) deleted_at is null or undefined",
    detailsActive.deleted_at === null || detailsActive.deleted_at === undefined,
  );
  assertProductLifecycle("initial details", detailsActive);

  // 10. As platform admin, update status to non-active (e.g., "inactive")
  const adminForUpdate: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminForUpdate);

  const updateBody = {
    status: "inactive",
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.update(
      connection,
      {
        productCode: productCode,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallProduct>(updatedProduct);

  TestValidator.equals(
    "updated product status is inactive",
    updatedProduct.status,
    "inactive",
  );

  // 11. Fetch details again after status change
  const detailsInactive: IShoppingMallProduct =
    await api.functional.shoppingMall.catalog.products.details.at(connection, {
      productCode: productCode,
    });
  typia.assert<IShoppingMallProduct>(detailsInactive);

  TestValidator.equals(
    "details after update: product code matches",
    detailsInactive.code,
    productCode,
  );
  TestValidator.equals(
    "details after update: status is inactive",
    detailsInactive.status,
    "inactive",
  );
  TestValidator.predicate(
    "details after update: deleted_at is still null or undefined",
    detailsInactive.deleted_at === null ||
      detailsInactive.deleted_at === undefined,
  );
  assertProductLifecycle("details after update", detailsInactive);

  // 12. As platform admin, erase the product
  const adminForErase: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminForErase);

  await api.functional.shoppingMall.platformAdmin.products.erase(connection, {
    productCode: productCode,
  });

  // 13. After erase, catalog.details.at must fail (we only assert that an error is thrown)
  await TestValidator.error(
    "catalog details should fail after product erase",
    async () => {
      await api.functional.shoppingMall.catalog.products.details.at(
        connection,
        {
          productCode: productCode,
        },
      );
    },
  );
}
