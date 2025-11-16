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
 * Test admin's ability to add compliant replacement images when enforcing
 * content policies.
 *
 * This test validates the complete marketplace quality control workflow where
 * platform administrators exercise moderation authority to replace
 * non-compliant seller images.
 *
 * The scenario simulates:
 *
 * 1. Admin account creation with moderation privileges
 * 2. Admin creating marketplace category structure
 * 3. Seller account creation and product listing setup
 * 4. Admin uploading replacement images to seller's product for content policy
 *    enforcement
 * 5. Validation of multi-resolution image variants and metadata
 *
 * This ensures admins can maintain marketplace image quality standards while
 * preserving product listing integrity during content moderation operations.
 */
export async function test_api_sale_image_admin_content_policy_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Register admin account for moderation authority
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
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

  // Step 2: Admin creates category for product organization
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(1),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
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

  // Step 4: Seller creates a product sale listing
  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 5: Switch back to admin context for content moderation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: admin.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 6: Admin uploads replacement product image for content policy enforcement
  const replacementImage: IShoppingMallSaleImage =
    await api.functional.shoppingMall.admin.sales.images.create(connection, {
      saleCode: sale.code,
      body: {
        shopping_mall_sale_sku_id: undefined,
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
  typia.assert(replacementImage);

  // Step 7: Validate replacement image properties
  TestValidator.equals(
    "replacement image belongs to sale",
    replacementImage.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.equals(
    "replacement image is primary",
    replacementImage.is_primary,
    true,
  );
  TestValidator.equals(
    "replacement image display order",
    replacementImage.display_order,
    0,
  );
}
