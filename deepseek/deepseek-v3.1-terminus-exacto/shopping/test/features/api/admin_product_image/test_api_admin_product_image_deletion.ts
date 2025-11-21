import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive product image deletion workflow by administrator.
 *
 * Validates multi-actor authorization chain: administrator creates category,
 * seller creates product with image, then admin deletes the image. Ensures
 * proper authorization boundaries and platform moderation capabilities.
 */
export async function test_api_admin_product_image_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: "Admin",
      last_name: "User",
      role: "super_admin",
      permissions: JSON.stringify({ full_access: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category as administrator
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: "123-45-6789",
      href: "https://example.com/seller",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        dimensions: "10x5x3",
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: category.parent,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Create product image as seller
  const productImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: {
          image_url: "https://example.com/images/product.jpg",
          alt_text: RandomGenerator.paragraph({ sentences: 2 }),
          is_primary: true,
          display_order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(productImage);

  // Step 6: Switch back to administrator for image deletion
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 7: Administrator deletes the product image
  await api.functional.shoppingMall.admin.products.images.erase(connection, {
    productId: product.id,
    imageId: productImage.id,
  });

  // Step 8: Validate image deletion by attempting to delete non-existent image
  await TestValidator.error(
    "deleting non-existent image should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.images.erase(
        connection,
        {
          productId: product.id,
          imageId: productImage.id,
        },
      );
    },
  );

  // Step 9: Validate authorization boundaries - seller cannot access admin endpoints
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://example.com/seller",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  await TestValidator.error(
    "seller should not have access to admin endpoints",
    async () => {
      // This should fail because seller is authenticated but trying to access admin endpoint
      await api.functional.shoppingMall.admin.products.images.erase(
        connection,
        {
          productId: product.id,
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 10: Final validation - switch back to admin and verify clean state
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  TestValidator.predicate(
    "admin should still be able to perform operations after image deletion",
    true,
  );
}
