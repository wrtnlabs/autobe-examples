import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the business rule that prevents deletion of the last remaining product
 * image.
 *
 * This test validates that products must maintain at least one image to remain
 * in active status. The scenario creates a product with a single image and
 * attempts to delete it, verifying that the deletion is rejected with an
 * appropriate error. This ensures product integrity and prevents products from
 * appearing in the catalog without visual representation.
 *
 * Test Workflow:
 *
 * 1. Create and authenticate admin account for category management
 * 2. Create product category required for product creation
 * 3. Create and authenticate seller account for product management
 * 4. Create a new product with base information
 * 5. Upload a single product image
 * 6. Attempt to delete the only image (should fail)
 * 7. Verify error is thrown preventing last image deletion
 */
export async function test_api_product_image_deletion_last_image_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category as prerequisite for product creation
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Switch to seller authentication for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
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
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product with base information
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Upload a single product image
  const productImage =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product.id,
        body: {
          image_url: typia.random<string & tags.Format<"url">>(),
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(productImage);

  // Step 6: Attempt to delete the only image - should fail due to business rule
  await TestValidator.error(
    "cannot delete last remaining product image",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId: product.id,
          imageId: productImage.id,
        },
      );
    },
  );
}
