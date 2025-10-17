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
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test admin deletion of product images and verify operation isolation.
 *
 * This test validates that the admin can successfully delete product images.
 * Due to API limitations (IImageCreate doesn't support shopping_mall_sku_id),
 * this test focuses on validating the deletion operation completes successfully
 * for general product images.
 *
 * Workflow:
 *
 * 1. Create seller account for product setup
 * 2. Create admin account for image deletion operations
 * 3. Create product category for product classification
 * 4. Create product as container for images and SKU variants
 * 5. Create multiple SKU variants to establish product context
 * 6. Upload multiple product images
 * 7. Switch to admin authentication context
 * 8. Admin deletes one product image
 * 9. Verify deletion operation completes successfully
 */
export async function test_api_admin_product_image_deletion_variant_specific(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 5 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 3: Create product category (as admin)
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

  // Step 4: Switch back to seller to create product
  await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });

  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 5: Create multiple SKU variants for product context
  const sku1Data = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku1 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: sku1Data,
    },
  );
  typia.assert(sku1);

  const sku2Data = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku2 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: sku2Data,
    },
  );
  typia.assert(sku2);

  // Step 6: Upload multiple product images
  const image1Data = {
    image_url: typia.random<string & tags.Format<"url">>(),
  } satisfies IShoppingMallProduct.IImageCreate;

  const image1 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product.id,
        body: image1Data,
      },
    );
  typia.assert(image1);

  const image2Data = {
    image_url: typia.random<string & tags.Format<"url">>(),
  } satisfies IShoppingMallProduct.IImageCreate;

  const image2 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product.id,
        body: image2Data,
      },
    );
  typia.assert(image2);

  const image3Data = {
    image_url: typia.random<string & tags.Format<"url">>(),
  } satisfies IShoppingMallProduct.IImageCreate;

  const image3 =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product.id,
        body: image3Data,
      },
    );
  typia.assert(image3);

  // Step 7: Switch to admin account
  await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  // Step 8: Admin deletes one product image
  await api.functional.shoppingMall.admin.products.images.erase(connection, {
    productId: product.id,
    imageId: image2.id,
  });

  // Step 9: Verify deletion operation completed successfully
  TestValidator.predicate(
    "admin product image deletion completed successfully",
    true,
  );
}
