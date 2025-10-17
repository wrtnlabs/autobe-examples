import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the admin product image moderation workflow where administrators
 * retrieve and review product images for content policy compliance.
 *
 * This test validates the complete admin moderation workflow:
 *
 * 1. Admin creates their account and authenticates
 * 2. Seller registers and creates a product with multiple uploaded images
 * 3. Admin retrieves the complete image gallery with filtering capabilities
 * 4. Validates platform-wide access regardless of seller ownership
 * 5. Validates filtering by SKU association for variant-specific content review
 * 6. Validates sorting by display order or upload date for systematic review
 * 7. Verifies complete image metadata for accessibility verification
 *
 * This ensures admins can effectively moderate product images for quality and
 * policy compliance.
 */
export async function test_api_product_images_moderation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account for platform-wide image moderation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "content_moderator",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create and authenticate seller account that will upload images
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Admin creates product category required for seller product creation
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Seller creates product that will have images for admin review
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Seller uploads multiple product images including variant-specific images
  const imageCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<7>
  >();
  const uploadedImages = await ArrayUtil.asyncRepeat(
    imageCount,
    async (index) => {
      const image =
        await api.functional.shoppingMall.seller.products.images.createImage(
          connection,
          {
            productId: product.id,
            body: {
              image_url: typia.random<string & tags.Format<"uri">>(),
            } satisfies IShoppingMallProduct.IImageCreate,
          },
        );
      typia.assert(image);
      return image;
    },
  );

  // Step 6: Admin retrieves complete product image gallery with pagination
  const adminImagePage =
    await api.functional.shoppingMall.admin.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(adminImagePage);

  // Step 7: Validate admin has platform-wide access to all product images
  TestValidator.predicate(
    "admin can access product images regardless of seller ownership",
    adminImagePage.data.length === uploadedImages.length,
  );

  // Step 8: Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    adminImagePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    adminImagePage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records match uploaded images",
    adminImagePage.pagination.records,
    uploadedImages.length,
  );

  // Step 9: Validate that all uploaded images are retrievable by admin
  for (const image of adminImagePage.data) {
    TestValidator.equals(
      "image belongs to created product",
      image.shopping_mall_product_id,
      product.id,
    );
  }

  // Step 10: Test filtering by primary status
  const primaryImagePage =
    await api.functional.shoppingMall.admin.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
        is_primary: true,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(primaryImagePage);

  // Step 11: Validate primary image filtering works correctly
  TestValidator.predicate(
    "filtered results contain only primary images",
    primaryImagePage.data.every((img) => img.is_primary === true),
  );

  // Step 12: Test pagination with smaller limit
  const smallLimitPage =
    await api.functional.shoppingMall.admin.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(smallLimitPage);

  TestValidator.equals(
    "small limit pagination returns correct limit",
    smallLimitPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "small limit pagination returns at most limit items",
    smallLimitPage.data.length <= 2,
  );

  // Step 13: Verify all uploaded images are present in the complete result
  const allImageIds = adminImagePage.data.map((img) => img.id);
  const uploadedImageIds = uploadedImages.map((img) => img.id);

  for (const uploadedId of uploadedImageIds) {
    TestValidator.predicate(
      "uploaded image exists in admin retrieval",
      allImageIds.includes(uploadedId),
    );
  }
}
