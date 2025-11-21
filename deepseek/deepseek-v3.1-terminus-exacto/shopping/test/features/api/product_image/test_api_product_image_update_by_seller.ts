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
 * Test comprehensive product image update workflow where a seller creates a
 * product, adds an image, then updates the image metadata including URL, alt
 * text, primary status, and display order. Validates that image updates
 * properly reflect in the product gallery and that primary image transitions
 * are handled correctly when changing is_primary status. Ensures ownership
 * verification prevents unauthorized updates to product images.
 */
export async function test_api_product_image_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/seller/registration",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ manage_categories: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller and create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/seller/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
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

  // Step 5: Add initial product image
  const initialImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: {
          image_url: `https://example.com/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 2 }),
          is_primary: false,
          display_order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(initialImage);

  // Step 6: Update image properties
  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.update(
      connection,
      {
        productId: product.id,
        imageId: initialImage.id,
        body: {
          image_url: `https://example.com/images/${typia.random<string & tags.Format<"uuid">>()}_updated.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 3 }),
          is_primary: true,
          display_order: 0,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);

  // Step 7: Verify image updates are correctly applied
  TestValidator.equals(
    "updated image URL should match",
    updatedImage.image_url,
    initialImage.image_url,
  );
  TestValidator.equals(
    "updated alt text should match",
    updatedImage.alt_text,
    initialImage.alt_text,
  );
  TestValidator.equals(
    "updated primary status should be true",
    updatedImage.is_primary,
    true,
  );
  TestValidator.equals(
    "updated display order should be 0",
    updatedImage.display_order,
    0,
  );

  // Step 8: Test primary image transition behavior by adding another image
  const secondImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: {
          image_url: `https://example.com/images/${typia.random<string & tags.Format<"uuid">>()}_second.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 2 }),
          is_primary: true, // This should demote the first image
          display_order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);

  // Verify second image is now primary
  TestValidator.equals(
    "second image should be primary",
    secondImage.is_primary,
    true,
  );

  // Step 9: Validate ownership security by attempting unauthorized updates
  // Create a different seller
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "other123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/seller/registration",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(otherSeller);

  // Switch to other seller and attempt to update the first seller's image
  await api.functional.auth.seller.login(connection, {
    body: {
      email: otherSellerEmail,
      password: "other123",
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/seller/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // This should fail due to ownership verification
  await TestValidator.error(
    "other seller cannot update first seller's image",
    async () => {
      await api.functional.shoppingMall.seller.products.images.update(
        connection,
        {
          productId: product.id,
          imageId: initialImage.id,
          body: {
            alt_text: "Unauthorized update attempt",
          } satisfies IShoppingMallProductImage.IUpdate,
        },
      );
    },
  );

  // Switch back to original seller for final verification
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/seller/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Final validation that original seller can still update their image
  const finalUpdate =
    await api.functional.shoppingMall.seller.products.images.update(
      connection,
      {
        productId: product.id,
        imageId: initialImage.id,
        body: {
          alt_text: "Final authorized update",
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  TestValidator.equals(
    "final alt text update should be applied",
    finalUpdate.alt_text,
    "Final authorized update",
  );
}
