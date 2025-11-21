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
 * Test product image deletion workflow where a seller creates a product with
 * multiple images and then deletes a specific image. Validates that image
 * deletion removes the image from the product gallery while maintaining proper
 * display order for remaining images.
 */
export async function test_api_product_image_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ manage_categories: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
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
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/join",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        compare_price: typia.random<
          number & tags.Minimum<10001> & tags.Maximum<20000>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
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

  // Step 5: Create multiple product images
  const images = await ArrayUtil.asyncRepeat(3, async (index) => {
    const image =
      await api.functional.shoppingMall.seller.products.images.create(
        connection,
        {
          productId: product.id,
          body: {
            image_url: `https://example.com/images/product-${product.id}-${index}.jpg`,
            alt_text: `Product image ${index + 1} for ${product.name}`,
            is_primary: index === 0,
            display_order: index + 1,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    return image;
  });

  // Step 6: Delete the second image
  await api.functional.shoppingMall.seller.products.images.erase(connection, {
    productId: product.id,
    imageId: images[1].id,
  });

  // Step 7: Validate deletion by ensuring remaining images are intact
  TestValidator.equals(
    "first image should remain primary",
    images[0].is_primary,
    true,
  );
  TestValidator.equals(
    "third image display order should remain unchanged",
    images[2].display_order,
    3,
  );

  // Step 8: Test unauthorized deletion attempt by different seller
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "seller456",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/join",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(otherSeller);

  // Switch authentication to the other seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: otherSellerEmail,
      password: "seller456",
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  await TestValidator.error(
    "other seller cannot delete images they don't own",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId: product.id,
          imageId: images[0].id,
        },
      );
    },
  );

  // Step 9: Switch back to original seller and validate hard delete
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Attempt to delete already deleted image (should fail)
  await TestValidator.error(
    "deleting non-existent image should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId: product.id,
          imageId: images[1].id, // This image was already deleted
        },
      );
    },
  );
}
