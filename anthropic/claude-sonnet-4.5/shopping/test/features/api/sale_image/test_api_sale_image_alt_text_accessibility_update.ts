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
 * Test updating image alt text to improve accessibility compliance and SEO
 * optimization for product images.
 *
 * This test validates the complete workflow of updating alt text for product
 * sale images, ensuring sellers can maintain WCAG accessibility compliance and
 * improve SEO through proper image descriptions. Alt text is critical for
 * screen readers and search engine discoverability, making this functionality
 * essential for marketplace inclusivity and product visibility.
 *
 * Test workflow:
 *
 * 1. Authenticate as seller to gain product management authorization
 * 2. Create admin account and authenticate for category creation
 * 3. Create product category as prerequisite for sale listing
 * 4. Create product sale listing for image attachment
 * 5. Upload initial product image with or without alt text
 * 6. Update the image alt_text field with descriptive accessibility content
 * 7. Retrieve updated image to verify alt_text persistence
 * 8. Validate alt_text follows accessibility guidelines (concise, descriptive)
 * 9. Confirm other image properties remain unchanged
 * 10. Test updating alt_text to null to remove accessibility text
 */
export async function test_api_sale_image_alt_text_accessibility_update(
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
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/seller/info",
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
      admin_level: "super_admin" as const,
      email_verified: true,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category (admin-only operation)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller and create product sale listing
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com/seller/dashboard",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Upload initial product image without alt text
  const initialImage =
    await api.functional.shoppingMall.seller.sales.images.create(connection, {
      saleCode: sale.code,
      body: {
        url_original: "https://cdn.example.com/products/original/image1.jpg",
        url_large: "https://cdn.example.com/products/large/image1.jpg",
        url_medium: "https://cdn.example.com/products/medium/image1.jpg",
        url_small: "https://cdn.example.com/products/small/image1.jpg",
        url_thumbnail: "https://cdn.example.com/products/thumb/image1.jpg",
        is_primary: true,
        display_order: 0,
      } satisfies IShoppingMallSaleImage.ICreate,
    });
  typia.assert(initialImage);

  // Step 6: Update image with descriptive alt text for accessibility
  const accessibleAltText =
    "Product front view showing design details and color";
  const updatedImage =
    await api.functional.shoppingMall.seller.sales.images.update(connection, {
      saleCode: sale.code,
      imageId: initialImage.id,
      body: {
        alt_text: accessibleAltText,
      } satisfies IShoppingMallSaleImage.IUpdate,
    });
  typia.assert(updatedImage);

  // Step 7: Verify alt_text was updated successfully
  TestValidator.equals(
    "alt text updated to accessibility description",
    updatedImage.alt_text,
    accessibleAltText,
  );

  // Step 8: Validate alt text follows accessibility guidelines (concise and descriptive)
  TestValidator.predicate(
    "alt text exists and is concise (under 125 characters recommended)",
    updatedImage.alt_text !== null &&
      updatedImage.alt_text !== undefined &&
      updatedImage.alt_text.length > 0 &&
      updatedImage.alt_text.length <= 125,
  );

  // Step 9: Confirm other image properties remain unchanged
  TestValidator.equals("image ID unchanged", updatedImage.id, initialImage.id);
  TestValidator.equals(
    "primary flag unchanged",
    updatedImage.is_primary,
    initialImage.is_primary,
  );
  TestValidator.equals(
    "display order unchanged",
    updatedImage.display_order,
    initialImage.display_order,
  );
  TestValidator.equals(
    "original URL unchanged",
    updatedImage.url_original,
    initialImage.url_original,
  );

  // Step 10: Test updating alt_text to null to remove accessibility text
  const imageWithNullAlt =
    await api.functional.shoppingMall.seller.sales.images.update(connection, {
      saleCode: sale.code,
      imageId: initialImage.id,
      body: {
        alt_text: null,
      } satisfies IShoppingMallSaleImage.IUpdate,
    });
  typia.assert(imageWithNullAlt);

  TestValidator.equals(
    "alt text successfully removed (set to null)",
    imageWithNullAlt.alt_text,
    null,
  );
}
