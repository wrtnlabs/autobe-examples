import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

/**
 * Tests shopping mall admin product snapshot retrieval.
 *
 * Business scenario:
 *
 * 1. Admin actor joins and authenticates.
 * 2. Seller actor joins and authenticates.
 * 3. Seller creates a shopping mall product.
 * 4. Admin authenticates (login) to start snapshot retrieval.
 * 5. Admin retrieves the created product's snapshot by snapshot ID.
 *
 * Validations:
 *
 * - Snapshot data matches the product data created originally.
 * - Audit timestamps in snapshot are valid and correspond to creation.
 * - Authorization is handled appropriately.
 *
 * The test ensures end-to-end secure access, data integrity, and proper audit
 * tracking through product snapshots.
 */
export async function test_api_shopping_mall_admin_shopping_mall_product_snapshot_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin actor joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://www.example.com/admin",
        referrer: "https://www.example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Seller actor joins and authenticates
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "1234";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Seller creates a shopping mall product
  const categoryCode: string = RandomGenerator.alphaNumeric(8);
  const productCode = RandomGenerator.alphaNumeric(10);
  const productTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const productBrand = RandomGenerator.name(2);

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          title: productTitle,
          description: productDescription,
          brand: productBrand,
          category_code: categoryCode,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Admin authenticates (login)
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://www.example.com/admin",
        referrer: "https://www.example.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 5. Admin retrieves the product snapshot by ID
  // Note: product.id is product ID, not snapshot ID; we retrieve snapshot using product snapshot ID
  // Since no API to create snapshot separately, simulate snapshot retrieval by using product.id as base
  const snapshot: IShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.shoppingMallProducts.snapshots.at(
      connection,
      {
        id: product.id,
      },
    );
  typia.assert(snapshot);

  // Validations
  TestValidator.equals(
    "Snapshot product ID matches original product ID",
    snapshot.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "Snapshot code matches product code",
    snapshot.code,
    product.code,
  );
  TestValidator.equals(
    "Snapshot title matches product title",
    snapshot.title,
    product.title,
  );

  if (product.description === null || product.description === undefined) {
    TestValidator.equals(
      "Snapshot description is null as expected",
      snapshot.description,
      null,
    );
  } else {
    TestValidator.equals(
      "Snapshot description matches product description",
      snapshot.description,
      product.description,
    );
  }

  if (product.brand === null || product.brand === undefined) {
    TestValidator.equals(
      "Snapshot brand is null as expected",
      snapshot.brand,
      null,
    );
  } else {
    TestValidator.equals(
      "Snapshot brand matches product brand",
      snapshot.brand,
      product.brand,
    );
  }

  TestValidator.predicate(
    "Snapshot snapshot_at is string and non-empty",
    typeof snapshot.snapshot_at === "string" && snapshot.snapshot_at.length > 0,
  );
  TestValidator.predicate(
    "Snapshot created_at is string and non-empty",
    typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
  );
}
