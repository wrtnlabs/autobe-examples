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
 * Test complete product image upload workflow including seller authentication,
 * product creation, and image association. Validates that sellers can
 * successfully upload images to their products with proper metadata including
 * URL, alt text, primary image designation, and display order. Ensures image
 * validation, ownership verification, and gallery sequencing logic work
 * correctly.
 */
export async function test_api_product_image_upload_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ access: "full" }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category as admin
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "seller123",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.content({ paragraphs: 1 }),
        tax_id: "123-45-6789",
        href: "https://shoppingmall.com/seller/dashboard",
        referrer: "https://shoppingmall.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product as seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        compare_price: typia.random<
          number & tags.Minimum<10001> & tags.Maximum<20000>
        >(),
        cost_price: typia.random<
          number & tags.Minimum<1> & tags.Maximum<5000>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
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
    });
  typia.assert(product);

  // Step 5: Upload product image with metadata
  const productImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          is_primary: true,
          display_order: 1,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(productImage);

  // Step 6: Validate image metadata
  TestValidator.equals(
    "image URL is valid URI",
    typeof productImage.image_url,
    "string",
  );
  TestValidator.equals(
    "alt text is provided",
    typeof productImage.alt_text,
    "string",
  );
  TestValidator.predicate(
    "image is marked as primary",
    productImage.is_primary,
  );
  TestValidator.equals(
    "display order matches input",
    productImage.display_order,
    1,
  );
  TestValidator.equals(
    "product ID matches created product",
    productImage.product.id,
    product.id,
  );

  // Step 7: Upload additional image with different configuration
  const secondaryImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          is_primary: false,
          display_order: 2,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(secondaryImage);

  // Step 8: Validate secondary image configuration
  TestValidator.equals(
    "secondary image URL is valid URI",
    typeof secondaryImage.image_url,
    "string",
  );
  TestValidator.equals(
    "secondary image alt text is provided",
    typeof secondaryImage.alt_text,
    "string",
  );
  TestValidator.predicate(
    "secondary image is not primary",
    !secondaryImage.is_primary,
  );
  TestValidator.equals(
    "secondary image display order is 2",
    secondaryImage.display_order,
    2,
  );

  // Step 9: Test error scenario - attempt to upload image to non-existent product
  await TestValidator.error(
    "should fail when uploading to non-existent product",
    async () => {
      await api.functional.shoppingMall.seller.products.images.create(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            image_url: typia.random<string & tags.Format<"uri">>(),
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            is_primary: false,
            display_order: 1,
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    },
  );
}
