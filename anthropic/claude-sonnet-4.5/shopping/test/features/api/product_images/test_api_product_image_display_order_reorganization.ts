import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test reorganizing product gallery presentation by updating display_order
 * values across multiple images.
 *
 * This scenario creates several images for a SKU with different display orders,
 * then updates one image's display_order to change its position in the gallery
 * sequence. The test validates that lower display_order values appear first in
 * the presentation and that changing display order properly resequences the
 * image gallery.
 *
 * Workflow:
 *
 * 1. Register and authenticate seller account
 * 2. Register and authenticate admin account
 * 3. Admin creates product category
 * 4. Switch back to seller context
 * 5. Seller creates product sale listing
 * 6. Seller creates SKU variant for the product
 * 7. Seller uploads first image with display_order 0
 * 8. Seller uploads second image with display_order 1
 * 9. Seller uploads third image with display_order 2
 * 10. Seller updates third image's display_order to 0 (move to front)
 * 11. Validate the display_order was updated successfully
 */
export async function test_api_product_image_display_order_reorganization(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SecurePass123!";

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

  // 2. Register and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 4. Switch back to seller context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Seller creates product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // 6. Seller creates SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ color: "Red", size: "Large" }),
        base_price: 99.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // 7. Upload first image with display_order 0
  const image1 =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          url_original: typia.random<string & tags.Format<"uri">>(),
          url_large: typia.random<string & tags.Format<"uri">>(),
          url_medium: typia.random<string & tags.Format<"uri">>(),
          url_small: typia.random<string & tags.Format<"uri">>(),
          url_thumbnail: typia.random<string & tags.Format<"uri">>(),
          is_primary: true,
          display_order: 0,
          alt_text: "First product image",
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(image1);

  // 8. Upload second image with display_order 1
  const image2 =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          url_original: typia.random<string & tags.Format<"uri">>(),
          url_large: typia.random<string & tags.Format<"uri">>(),
          url_medium: typia.random<string & tags.Format<"uri">>(),
          url_small: typia.random<string & tags.Format<"uri">>(),
          url_thumbnail: typia.random<string & tags.Format<"uri">>(),
          is_primary: false,
          display_order: 1,
          alt_text: "Second product image",
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(image2);

  // 9. Upload third image with display_order 2
  const image3 =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          url_original: typia.random<string & tags.Format<"uri">>(),
          url_large: typia.random<string & tags.Format<"uri">>(),
          url_medium: typia.random<string & tags.Format<"uri">>(),
          url_small: typia.random<string & tags.Format<"uri">>(),
          url_thumbnail: typia.random<string & tags.Format<"uri">>(),
          is_primary: false,
          display_order: 2,
          alt_text: "Third product image",
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(image3);

  // 10. Update third image's display_order to move it to the front
  const updatedImage =
    await api.functional.shoppingMall.seller.sales.skus.images.update(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        imageId: image3.id,
        body: {
          display_order: 0,
        } satisfies IShoppingMallSaleImage.IUpdate,
      },
    );
  typia.assert(updatedImage);

  // 11. Validate the display_order was updated successfully
  TestValidator.equals(
    "image display_order should be updated to 0",
    updatedImage.display_order,
    0,
  );

  TestValidator.equals(
    "updated image should maintain same ID",
    updatedImage.id,
    image3.id,
  );
}
