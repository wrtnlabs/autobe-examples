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
 * Test deleting one image from a product sale that has multiple images in its
 * gallery.
 *
 * This scenario validates that when a sale has multiple product images,
 * deleting one specific image does not affect the other images. The test
 * creates a seller account, category, and sale listing, then uploads multiple
 * product images with different display orders. After deleting one of the
 * non-primary images, it verifies that the other images remain intact with
 * their original display orders and properties.
 *
 * This tests the image gallery management functionality where sellers need to
 * remove specific images while maintaining the rest of their product
 * photography.
 *
 * Steps:
 *
 * 1. Create a seller account for authentication
 * 2. Switch to admin and create a category for the product sale
 * 3. Switch back to seller and create a product sale listing
 * 4. Upload first product image with display_order 0 (primary)
 * 5. Upload second product image with display_order 1
 * 6. Upload third product image with display_order 2 (to be deleted)
 * 7. Delete the third image
 * 8. Verify the deleted image data is returned correctly
 */
export async function test_api_sale_image_deletion_multiple_images(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller1234";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Switch to admin and create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin1234";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://marketplace.example.com/admin/register",
      referrer: "https://marketplace.example.com",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Switch back to seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 4: Upload first product image (primary)
  const image1 = await api.functional.shoppingMall.seller.sales.images.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        url_original: "https://cdn.example.com/original1.jpg",
        url_large: "https://cdn.example.com/large1.jpg",
        url_medium: "https://cdn.example.com/medium1.jpg",
        url_small: "https://cdn.example.com/small1.jpg",
        url_thumbnail: "https://cdn.example.com/thumb1.jpg",
        is_primary: true,
        display_order: 0,
        alt_text: "Product image 1",
      } satisfies IShoppingMallSaleImage.ICreate,
    },
  );
  typia.assert(image1);

  // Step 5: Upload second product image
  const image2 = await api.functional.shoppingMall.seller.sales.images.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        url_original: "https://cdn.example.com/original2.jpg",
        url_large: "https://cdn.example.com/large2.jpg",
        url_medium: "https://cdn.example.com/medium2.jpg",
        url_small: "https://cdn.example.com/small2.jpg",
        url_thumbnail: "https://cdn.example.com/thumb2.jpg",
        is_primary: false,
        display_order: 1,
        alt_text: "Product image 2",
      } satisfies IShoppingMallSaleImage.ICreate,
    },
  );
  typia.assert(image2);

  // Step 6: Upload third product image (to be deleted)
  const image3 = await api.functional.shoppingMall.seller.sales.images.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        url_original: "https://cdn.example.com/original3.jpg",
        url_large: "https://cdn.example.com/large3.jpg",
        url_medium: "https://cdn.example.com/medium3.jpg",
        url_small: "https://cdn.example.com/small3.jpg",
        url_thumbnail: "https://cdn.example.com/thumb3.jpg",
        is_primary: false,
        display_order: 2,
        alt_text: "Product image 3",
      } satisfies IShoppingMallSaleImage.ICreate,
    },
  );
  typia.assert(image3);

  // Step 7: Delete the third image
  const deletedImage =
    await api.functional.shoppingMall.seller.sales.images.erase(connection, {
      saleCode: sale.code,
      imageId: image3.id,
    });
  typia.assert(deletedImage);

  // Step 8: Verify the deleted image data
  TestValidator.equals("deleted image ID matches", deletedImage.id, image3.id);
  TestValidator.equals(
    "deleted image display order",
    deletedImage.display_order,
    2,
  );
  TestValidator.equals(
    "deleted image is not primary",
    deletedImage.is_primary,
    false,
  );
}
