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
 * Test that a seller can successfully delete a product image from their own
 * sale listing.
 *
 * This test validates the complete workflow of image management by sellers,
 * including:
 *
 * 1. Seller account creation and authentication
 * 2. Admin account creation for category setup
 * 3. Product category creation (admin-only operation)
 * 4. Product sale listing creation by the seller
 * 5. Product image upload to the sale
 * 6. Product image deletion by the owner seller
 *
 * The test ensures that sellers can properly manage their product visual assets
 * by removing images when needed, and that the deletion operation returns the
 * deleted image record for confirmation.
 */
export async function test_api_sale_image_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
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

  // Step 2: Create and authenticate admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
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

  // Step 3: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Seller creates a product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        brand: RandomGenerator.name(1),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        short_description: RandomGenerator.paragraph({ sentences: 5 }),
        meta_keywords: RandomGenerator.name(3),
        weight: typia.random<number>(),
        dimension_length: typia.random<number>(),
        dimension_width: typia.random<number>(),
        dimension_height: typia.random<number>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
        warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
        status: "draft",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Seller uploads a product image to the sale
  const imageData = {
    url_original: typia.random<string & tags.Format<"uri">>(),
    url_large: typia.random<string & tags.Format<"uri">>(),
    url_medium: typia.random<string & tags.Format<"uri">>(),
    url_small: typia.random<string & tags.Format<"uri">>(),
    url_thumbnail: typia.random<string & tags.Format<"uri">>(),
    is_primary: true,
    display_order: 0,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallSaleImage.ICreate;

  const uploadedImage =
    await api.functional.shoppingMall.seller.sales.images.create(connection, {
      saleCode: sale.code,
      body: imageData,
    });
  typia.assert(uploadedImage);

  // Step 7: Seller deletes the uploaded image (main test operation)
  const deletedImage =
    await api.functional.shoppingMall.seller.sales.images.erase(connection, {
      saleCode: sale.code,
      imageId: uploadedImage.id,
    });
  typia.assert(deletedImage);

  // Step 8: Validate deletion results
  TestValidator.equals(
    "deleted image ID matches uploaded image",
    deletedImage.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "deleted image sale ID matches",
    deletedImage.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.equals(
    "deleted image URLs match original",
    deletedImage.url_original,
    imageData.url_original,
  );
}
