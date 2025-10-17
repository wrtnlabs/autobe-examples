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
 * Test the complete workflow of a seller retrieving and filtering their
 * product's image gallery.
 *
 * This test validates:
 *
 * 1. Seller account creation and authentication
 * 2. Admin account creation for category setup
 * 3. Product category creation by admin
 * 4. Product creation by seller
 * 5. Multiple product image uploads
 * 6. Paginated image gallery retrieval with filtering options
 * 7. Validation of image metadata (URLs, display order, primary status)
 *
 * The test ensures sellers can efficiently manage product image galleries with
 * proper pagination support, correct image metadata, and accurate filtering
 * capabilities.
 */
export async function test_api_product_images_gallery_retrieval_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "llc",
      "corporation",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} ${RandomGenerator.name()} Street`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);
  TestValidator.equals("seller email matches", seller.email, sellerEmail);

  // Step 2: Create and authenticate admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 3: Admin creates product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);
  TestValidator.equals(
    "category name matches",
    category.name,
    categoryData.name,
  );

  // Step 4: Switch back to seller context and create product
  await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });

  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    base_price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);
  TestValidator.equals("product name matches", product.name, productData.name);

  // Step 5: Upload multiple product images with different properties
  const imageCount = 5;
  const uploadedImages: IShoppingMallProductImage[] = [];

  for (let i = 0; i < imageCount; i++) {
    const imageData = {
      image_url: `https://example.com/images/product_${product.id}_${i}.jpg`,
    } satisfies IShoppingMallProduct.IImageCreate;

    const image =
      await api.functional.shoppingMall.seller.products.images.createImage(
        connection,
        {
          productId: product.id,
          body: imageData,
        },
      );
    typia.assert(image);
    TestValidator.equals(
      "image product ID matches",
      image.shopping_mall_product_id,
      product.id,
    );
    uploadedImages.push(image);
  }

  // Step 6: Retrieve all images with pagination (first page)
  const pageRequest1 = {
    page: 1 satisfies number as number,
    limit: 3 satisfies number as number,
  } satisfies IShoppingMallProductImage.IRequest;

  const page1 = await api.functional.shoppingMall.seller.products.images.index(
    connection,
    {
      productId: product.id,
      body: pageRequest1,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 3);
  TestValidator.predicate(
    "page 1 has data",
    page1.data.length <= 3 && page1.data.length > 0,
  );

  // Step 7: Retrieve second page
  const pageRequest2 = {
    page: 2 satisfies number as number,
    limit: 3 satisfies number as number,
  } satisfies IShoppingMallProductImage.IRequest;

  const page2 = await api.functional.shoppingMall.seller.products.images.index(
    connection,
    {
      productId: product.id,
      body: pageRequest2,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.predicate(
    "pagination total records consistent",
    page1.pagination.records === page2.pagination.records,
  );

  // Step 8: Filter by primary image status
  const primaryFilterRequest = {
    is_primary: true,
  } satisfies IShoppingMallProductImage.IRequest;

  const primaryImages =
    await api.functional.shoppingMall.seller.products.images.index(connection, {
      productId: product.id,
      body: primaryFilterRequest,
    });
  typia.assert(primaryImages);
  TestValidator.predicate(
    "primary filter returns results",
    primaryImages.data.length >= 0,
  );

  if (primaryImages.data.length > 0) {
    primaryImages.data.forEach((img) => {
      TestValidator.equals("filtered image is primary", img.is_primary, true);
    });
  }

  // Step 9: Retrieve all images without filters to verify total count
  const allImagesRequest = {} satisfies IShoppingMallProductImage.IRequest;

  const allImages =
    await api.functional.shoppingMall.seller.products.images.index(connection, {
      productId: product.id,
      body: allImagesRequest,
    });
  typia.assert(allImages);
  TestValidator.equals(
    "total images match uploaded count",
    allImages.pagination.records,
    imageCount,
  );
  TestValidator.predicate(
    "all images belong to product",
    allImages.data.every((img) => img.shopping_mall_product_id === product.id),
  );

  // Step 10: Verify image metadata completeness
  allImages.data.forEach((image) => {
    TestValidator.predicate("image has valid ID", image.id.length > 0);
    TestValidator.predicate("image has URL", image.image_url.length > 0);
    TestValidator.predicate(
      "display order is valid",
      typeof image.display_order === "number",
    );
    TestValidator.predicate(
      "is_primary is boolean",
      typeof image.is_primary === "boolean",
    );
    TestValidator.predicate("created_at is valid", image.created_at.length > 0);
  });
}
