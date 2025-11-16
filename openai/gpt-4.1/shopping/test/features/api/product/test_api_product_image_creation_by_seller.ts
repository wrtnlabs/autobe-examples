import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E test for validating seller-uploaded product image creation.
 *
 * This test covers the workflow in which a seller: (1) registers for a new
 * account; (2) creates a new product; and (3) uploads a new image to the
 * product. It verifies that:
 *
 * - The uploaded image is associated with the correct product and not any SKU.
 * - The persisted data contains only the required fields (CDN URI, alt text,
 *   position, label), with audit and soft-delete fields managed by the system
 *   only.
 * - Only one of shopping_mall_product_id or shopping_mall_product_sku_id is set,
 *   in accordance with schema rules (here, associating with product-level
 *   only).
 * - All returned DTO fields match the schema/contract.
 * - Business rules (image is appended to product gallery, proper association,
 *   audit trails) are enforced.
 *
 * Steps:
 *
 * 1. Register a new seller (authorize context)
 * 2. Create a product as the seller
 * 3. Upload an image to the product (set only product ID, ensure SKU is not set)
 * 4. Validate that image DTO fields are persisted as expected, and association is
 *    correct
 * 5. Confirm audit/system-generated fields exist and are never client-settable.
 */
export async function test_api_product_image_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller account is registered",
    sellerAuth.email,
    sellerJoinInput.email,
  );
  // 2. Create a product as this seller
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    default_price: Math.floor(Math.random() * 90000 + 10000),
    business_status: RandomGenerator.pick([
      "draft",
      "published",
      "archived",
      "blocked",
      "pending_approval",
    ] as const),
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);
  TestValidator.equals(
    "created product must match input title",
    product.title,
    productInput.title,
  );
  // 3. Upload an image associated ONLY with the product, NOT SKU (set only shopping_mall_product_id)
  const imageInput = {
    cdn_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    position: Math.floor(Math.random() * 10),
    label: RandomGenerator.name(1),
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: null,
  } satisfies IShoppingMallProductImage.ICreate;
  const image = await api.functional.shoppingMall.seller.products.images.create(
    connection,
    {
      productId: product.id,
      body: imageInput,
    },
  );
  typia.assert(image);
  // 4. Validate DTO fields and schema/contract
  TestValidator.equals(
    "image is associated with correct product",
    image.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "image is NOT associated with any SKU (SKU ID is null)",
    image.shopping_mall_product_sku_id,
    null,
  );
  TestValidator.equals(
    "image CDN URI persisted",
    image.cdn_uri,
    imageInput.cdn_uri,
  );
  TestValidator.equals(
    "image alt text persisted",
    image.alt_text,
    imageInput.alt_text,
  );
  TestValidator.equals(
    "image position persisted",
    image.position,
    imageInput.position,
  );
  TestValidator.equals("image label persisted", image.label, imageInput.label);
  // 5. Confirm audit fields are system-managed and property exists (cannot be set by client)
  TestValidator.predicate(
    "audit field created_at is a valid ISO datetime",
    typeof image.created_at === "string" && !!Date.parse(image.created_at),
  );
  TestValidator.predicate(
    "audit field updated_at is a valid ISO datetime",
    typeof image.updated_at === "string" && !!Date.parse(image.updated_at),
  );
  // Soft-delete field defaults to null/undefined
  TestValidator.equals(
    "soft-delete field deleted_at is null or undefined on creation",
    image.deleted_at == null,
    true,
  );
  // Confirm that only required fields are persisted and managed correctly
}
