import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test public retrieval of product sale images without authentication.
 *
 * This test validates that product images can be accessed publicly without
 * requiring authentication, which is essential for marketplace browsing and
 * product discovery. Potential buyers and anonymous visitors must be able to
 * view product images to make informed purchase decisions.
 *
 * Test workflow:
 *
 * 1. Authenticate as seller to create test data
 * 2. Create a product category (required for sale creation)
 * 3. Create a product sale listing assigned to the category
 * 4. Authenticate as admin to upload product image
 * 5. Upload a product image to the sale listing
 * 6. Retrieve the image without authentication using GET endpoint
 * 7. Validate that the image data is returned successfully with all image URLs
 * 8. Verify image metadata including display order, primary flag, and alt text
 * 9. Confirm that public access works without requiring authentication
 */
export async function test_api_sale_image_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for test data setup
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create product category (admin authenticated)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Switch to seller authentication to create sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create product sale listing
  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        short_description: RandomGenerator.paragraph({ sentences: 3 }),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 6: Switch back to admin authentication to upload image
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 7: Upload product image
  const uploadedImage: IShoppingMallSaleImage =
    await api.functional.shoppingMall.admin.sales.images.create(connection, {
      saleCode: sale.code,
      body: {
        url_original: typia.random<string & tags.Format<"uri">>(),
        url_large: typia.random<string & tags.Format<"uri">>(),
        url_medium: typia.random<string & tags.Format<"uri">>(),
        url_small: typia.random<string & tags.Format<"uri">>(),
        url_thumbnail: typia.random<string & tags.Format<"uri">>(),
        is_primary: true,
        display_order: 0,
        alt_text: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IShoppingMallSaleImage.ICreate,
    });
  typia.assert(uploadedImage);

  // Step 8: Create unauthenticated connection for public access test
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 9: Retrieve image without authentication (public access)
  const retrievedImage: IShoppingMallSaleImage =
    await api.functional.shoppingMall.sales.images.at(unauthConn, {
      saleCode: sale.code,
      imageId: uploadedImage.id,
    });
  typia.assert(retrievedImage);

  // Step 10: Validate image data completeness
  TestValidator.equals("image ID matches", retrievedImage.id, uploadedImage.id);
  TestValidator.equals(
    "sale ID association correct",
    retrievedImage.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.equals(
    "primary flag preserved",
    retrievedImage.is_primary,
    uploadedImage.is_primary,
  );
  TestValidator.equals(
    "display order preserved",
    retrievedImage.display_order,
    uploadedImage.display_order,
  );

  // Step 11: Validate all image URL variants are present
  TestValidator.predicate(
    "original URL exists",
    retrievedImage.url_original.length > 0,
  );
  TestValidator.predicate(
    "large URL exists",
    retrievedImage.url_large.length > 0,
  );
  TestValidator.predicate(
    "medium URL exists",
    retrievedImage.url_medium.length > 0,
  );
  TestValidator.predicate(
    "small URL exists",
    retrievedImage.url_small.length > 0,
  );
  TestValidator.predicate(
    "thumbnail URL exists",
    retrievedImage.url_thumbnail.length > 0,
  );
}
