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
 * Test admin cross-seller product image deletion for content moderation.
 *
 * Validates that administrators can delete product images from any seller's
 * products regardless of ownership. This test creates two sellers with products
 * and images, then authenticates as admin to delete images from both sellers'
 * products.
 *
 * Steps:
 *
 * 1. Create first seller account and authenticate
 * 2. Create admin account and authenticate (switches context)
 * 3. Admin creates product category
 * 4. Create and authenticate as first seller again to create product
 * 5. First seller uploads multiple product images
 * 6. Create second seller account and authenticate
 * 7. Second seller creates product
 * 8. Second seller uploads product images
 * 9. Create and authenticate as admin again
 * 10. Admin deletes image from first seller's product
 * 11. Admin deletes image from second seller's product
 */
export async function test_api_admin_product_image_deletion_cross_seller(
  connection: api.IConnection,
) {
  // Step 1: Create first seller account
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = typia.random<string & tags.MinLength<8>>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
        "partnership",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1);

  // Step 2: Create admin account (this switches authentication context)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Authenticate as first seller again to create product
  await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      business_name: RandomGenerator.name(2),
      business_type: "individual",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 2 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });

  const seller1Product =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(seller1Product);

  // Step 5: First seller uploads product images
  const seller1Image1 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: seller1Product.id,
        body: {
          image_url: typia.random<string & tags.Format<"url">>(),
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(seller1Image1);

  const seller1Image2 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: seller1Product.id,
        body: {
          image_url: typia.random<string & tags.Format<"url">>(),
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(seller1Image2);

  // Step 6: Create second seller account
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = typia.random<string & tags.MinLength<8>>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
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
  typia.assert(seller2);

  // Step 7: Second seller creates product
  const seller2Product =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(seller2Product);

  // Step 8: Second seller uploads product images
  const seller2Image1 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: seller2Product.id,
        body: {
          image_url: typia.random<string & tags.Format<"url">>(),
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(seller2Image1);

  const seller2Image2 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: seller2Product.id,
        body: {
          image_url: typia.random<string & tags.Format<"url">>(),
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(seller2Image2);

  // Step 9: Authenticate as admin again for content moderation
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Step 10: Admin deletes image from first seller's product (cross-seller moderation)
  await api.functional.shoppingMall.admin.products.images.erase(connection, {
    productId: seller1Product.id,
    imageId: seller1Image1.id,
  });

  // Step 11: Admin deletes image from second seller's product (demonstrating unrestricted access)
  await api.functional.shoppingMall.admin.products.images.erase(connection, {
    productId: seller2Product.id,
    imageId: seller2Image1.id,
  });
}
