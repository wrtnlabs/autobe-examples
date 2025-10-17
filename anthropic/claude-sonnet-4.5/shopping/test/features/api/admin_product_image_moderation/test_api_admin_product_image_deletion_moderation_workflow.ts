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
 * Test the complete admin moderation workflow for removing inappropriate or
 * policy-violating product images.
 *
 * This test simulates content moderation where an admin identifies and removes
 * problematic product images uploaded by sellers. The test creates multiple
 * seller products with various images, then authenticates as admin to search
 * for and delete images that violate content policies.
 *
 * Steps:
 *
 * 1. Create first seller account and authenticate
 * 2. Create second seller account and authenticate
 * 3. Create admin account for content moderation
 * 4. Admin creates product category for listings
 * 5. Switch back to first seller and create product with images
 * 6. Switch to second seller and create product with images
 * 7. Admin deletes problematic images from both sellers' products
 * 8. Validate successful deletion through completion without errors
 */
export async function test_api_admin_product_image_deletion_moderation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create first seller account and authenticate
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1);

  // Step 2: Create second seller account and authenticate
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: "Corporation",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller2);

  // Step 3: Create admin account for content moderation
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

  // Step 4: Admin creates product category for listings
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Switch back to first seller and create product with images
  await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1.token.access,
      business_name: seller1.business_name,
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });

  const product1 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<1>>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);

  const image1_1 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product1.id,
        body: {
          image_url: typia.random<string & tags.Format<"url">>(),
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(image1_1);

  const image1_2 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product1.id,
        body: {
          image_url: typia.random<string & tags.Format<"url">>(),
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(image1_2);

  // Step 6: Switch to second seller and create product with images
  await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2.token.access,
      business_name: seller2.business_name,
      business_type: "Corporation",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });

  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<1>>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);

  const image2_1 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product2.id,
        body: {
          image_url: typia.random<string & tags.Format<"url">>(),
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(image2_1);

  // Step 7: Admin deletes problematic images from both sellers' products
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: admin.token.access,
      name: admin.name,
      role_level: admin.role_level,
    } satisfies IShoppingMallAdmin.ICreate,
  });

  await api.functional.shoppingMall.admin.products.images.erase(connection, {
    productId: product1.id,
    imageId: image1_1.id,
  });

  await api.functional.shoppingMall.admin.products.images.erase(connection, {
    productId: product2.id,
    imageId: image2_1.id,
  });

  // Step 8: Validation is implicit - successful completion without errors
  // confirms admin can delete images from any seller's product regardless of ownership
}
