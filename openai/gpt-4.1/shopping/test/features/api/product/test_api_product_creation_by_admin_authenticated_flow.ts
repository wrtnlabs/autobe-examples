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
 * Validates admin-authenticated product creation in platform catalog.
 *
 * 1. Register an admin using valid, business-compliant credentials.
 * 2. Authenticate as the admin (token is handled in context automatically).
 * 3. Call product creation as admin, supplying all required fields
 *    (IShoppingProduct.ICreate).
 * 4. Assert that response matches input: critical business fields, seller summary
 *    presence, and expected status/business_status.
 * 5. Confirm all product response types and structure through typia.assert. No
 *    redundant type checks.
 */
export async function test_api_product_creation_by_admin_authenticated_flow(
  connection: api.IConnection,
) {
  // 1. Register admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminName: string = RandomGenerator.name();
  const adminRole: string = "super";
  const adminStatus: string = "active";
  const adminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: adminRole,
        status: adminStatus,
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin status matches input",
    adminAuth.status,
    adminStatus,
  );
  TestValidator.equals("admin role matches input", adminAuth.role, adminRole);
  TestValidator.equals(
    "admin email matches input",
    adminAuth.email,
    adminEmail,
  );
  TestValidator.equals("admin name matches input", adminAuth.name, adminName);

  // 2. Create product as admin
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 9,
  });
  const productDescription: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 4,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 12,
  });
  const productImage: string = `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(12)}.jpg`;
  const productStatus: string = "draft";
  const productBusinessStatus: string = "in_review";
  const createBody = {
    code: productCode,
    name: productName,
    description: productDescription,
    main_image_uri: productImage,
    status: productStatus,
    business_status: productBusinessStatus,
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.admin.products.create(connection, {
      body: createBody,
    });
  typia.assert(product);
  // 3. Assert core product fields match input (business critical fields)
  TestValidator.equals("product code matches", product.code, productCode);
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.equals(
    "product description matches",
    product.description,
    productDescription,
  );
  TestValidator.equals(
    "main_image_uri matches",
    product.main_image_uri,
    productImage,
  );
  TestValidator.equals("product status matches", product.status, productStatus);
  TestValidator.equals(
    "product business_status matches",
    product.business_status,
    productBusinessStatus,
  );
  // 4. Assert product is attached to admin/seller context
  TestValidator.predicate(
    "seller summary present",
    !!product.seller && typeof product.seller.id === "string",
  );
  // 5. Confirm other critical structure through typia.assert (already done)
}
