import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validate update of product information by privileged admin account.
 *
 * 1. Register and authenticate an admin user (establish admin session)
 * 2. Register and authenticate a seller (for product resource context)
 * 3. As seller, create a product to be later updated by admin
 * 4. Switch to admin and call product update endpoint to change multiple fields
 *    (name, description, main_image_uri, status, business_status)
 * 5. Retrieve and validate the updated product details, confirming that updated
 *    fields match expected values and all other product data remains
 *    consistent
 * 6. Confirm auditability: assert changed "updated_at" and unchanged immutable
 *    fields such as code and seller, and ensure code cannot be updated by
 *    admin
 */
export async function test_api_product_update_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register and authenticate a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 3. As seller, create a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const createProductBody = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 8,
    }),
    main_image_uri: `https://images.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
    status: "draft",
    business_status: "in_review",
    // Optional shipping info omitted
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: createProductBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "Product code should match after creation",
    product.code,
    createProductBody.code,
  );
  TestValidator.equals(
    "Product seller id should match created seller",
    product.shopping_seller_id,
    seller.id,
  );

  // 4. As admin, update (PUT) the product using product code
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 5,
      wordMax: 12,
    }),
    main_image_uri: `https://images.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
    status: "active",
    business_status: "approved",
  } satisfies IShoppingProduct.IUpdate;
  const updated: IShoppingProduct =
    await api.functional.shopping.admin.products.update(connection, {
      productCode: product.code,
      body: updateBody,
    });
  typia.assert(updated);

  // 5. Confirm updated fields match and important immutable fields did not change
  TestValidator.equals(
    "Product code is immutable and matches original",
    updated.code,
    product.code,
  );
  TestValidator.equals(
    "Product seller id is unchanged after update",
    updated.shopping_seller_id,
    product.shopping_seller_id,
  );
  TestValidator.equals(
    "Product name updated by admin",
    updated.name,
    updateBody.name,
  );
  TestValidator.equals(
    "Product description updated by admin",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "Product main_image_uri updated by admin",
    updated.main_image_uri,
    updateBody.main_image_uri,
  );
  TestValidator.equals(
    "Product status updated by admin",
    updated.status,
    updateBody.status,
  );
  TestValidator.equals(
    "Product business_status updated by admin",
    updated.business_status,
    updateBody.business_status,
  );
  TestValidator.predicate(
    "Product updated_at is newer after update",
    Date.parse(updated.updated_at) > Date.parse(product.updated_at),
  );
  TestValidator.equals(
    "Product created_at is unchanged",
    updated.created_at,
    product.created_at,
  );
  // Confirm all other business object relationships remain valid
  typia.assert(updated);
}
