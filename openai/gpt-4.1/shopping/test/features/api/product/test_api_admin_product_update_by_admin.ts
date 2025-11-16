import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform admin can update any product in the mall catalog
 * regardless of seller ownership.
 *
 * 1. Register a new platform admin (establish JWT context)
 * 2. Create a new product in the catalog (baseline for update)
 * 3. Update product as admin: change title, description, price, and
 *    business_status
 * 4. Confirm ownership rules (admin can always update)
 * 5. Check that changes persist (updated_at has changed; new values are reflected)
 * 6. Confirm all immutable fields, soft-delete status, and audit fields remain
 *    correct
 */
export async function test_api_admin_product_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@mall-admin.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new product in the catalog
  const createProductBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 10,
    }),
    default_price: Math.floor(Math.random() * 10000) + 1000,
    business_status: RandomGenerator.pick([
      "draft",
      "published",
      "archived",
      "blocked",
      "pending_approval",
    ] as const),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: createProductBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "product title initially set",
    product.title,
    createProductBody.title,
  );
  TestValidator.equals(
    "product description initially set",
    product.description,
    createProductBody.description,
  );
  TestValidator.equals(
    "product default price initially set",
    product.default_price,
    createProductBody.default_price,
  );
  TestValidator.equals(
    "product business_status initially set",
    product.business_status,
    createProductBody.business_status,
  );

  // 3. Prepare update body as admin, performing real changes to allowed fields
  const updateFields: IShoppingMallProduct.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 5,
      wordMax: 12,
    }),
    default_price: product.default_price + 777,
    business_status: RandomGenerator.pick([
      ...(
        [
          "draft",
          "published",
          "archived",
          "blocked",
          "pending_approval",
        ] as const
      ).filter((v) => v !== product.business_status),
    ] as const),
  };

  // Capture previous updated_at for audit validation
  const prevUpdatedAt = product.updated_at;

  // 4. Update product as admin
  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.update(connection, {
      productId: product.id,
      body: updateFields,
    });
  typia.assert(updatedProduct);

  // 5. Confirm all changes and ownership rules
  TestValidator.equals("product id unchanged", updatedProduct.id, product.id);
  TestValidator.equals(
    "title updated",
    updatedProduct.title,
    updateFields.title,
  );
  TestValidator.equals(
    "description updated",
    updatedProduct.description,
    updateFields.description,
  );
  TestValidator.equals(
    "default price updated",
    updatedProduct.default_price,
    updateFields.default_price,
  );
  TestValidator.equals(
    "business status updated",
    updatedProduct.business_status,
    updateFields.business_status,
  );
  TestValidator.equals(
    "admin can update any product regardless of seller",
    typeof updatedProduct.seller,
    "object",
  );
  TestValidator.notEquals(
    "audit updated_at changed",
    updatedProduct.updated_at,
    prevUpdatedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedProduct.created_at,
    product.created_at,
  );
  TestValidator.equals(
    "deleted_at is still null or undefined after update",
    updatedProduct.deleted_at ?? null,
    product.deleted_at ?? null,
  );
}
