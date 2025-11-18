import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate admin remediation of non-compliant product content via admin update
 * endpoint.
 *
 * Business context:
 *
 * - A seller can create products whose content might violate marketplace policies
 *   (e.g., misleading or prohibited terms).
 * - Administrators must be able to intervene after such violations are detected
 *   by external policy/risk systems.
 * - Admins use a dedicated admin-only update path to correct product content and
 *   adjust lifecycle status to reflect enforcement actions.
 *
 * Scenario steps:
 *
 * 1. Register a seller account using /auth/seller/join.
 * 2. Log in as the seller with /auth/seller/login to establish seller context.
 * 3. As the seller, create a product via /shoppingMall/seller/products with
 *    clearly non-compliant content (e.g., title and description containing a
 *    "BANNED" marker to simulate a policy violation).
 * 4. Register an admin account using /auth/admin/join.
 * 5. Log in as the admin using /auth/admin/login.
 * 6. As the admin, call /shoppingMall/admin/products/{productId} (PUT) with
 *    IShoppingMallProduct.IUpdate to:
 *
 *    - Replace title/summary/description with compliant text.
 *    - Change status to a governance-related value such as "admin_unpublished".
 * 7. Validate that the response product:
 *
 *    - Has the same id and shopping_mall_seller_id as the original product.
 *    - Reflects the updated title, summary, description, and status from the admin
 *         request.
 *    - Preserves immutable or untouched fields such as code.
 * 8. Additionally verify that at least one descriptive field (e.g., description)
 *    actually changed.
 */
export async function test_api_admin_product_update_after_policy_enforcement(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoinOutput);

  // 2. Seller login to simulate a normal authentication flow
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginOutput);

  // 3. Seller creates a product with intentionally non-compliant content
  const nonCompliantTitle = `BANNED PRODUCT ${RandomGenerator.paragraph({
    sentences: 2,
  })}`;
  const nonCompliantSummary = `BANNED SUMMARY ${RandomGenerator.paragraph({
    sentences: 3,
  })}`;
  const nonCompliantDescription = `This description contains BANNED terms. ${RandomGenerator.content(
    {
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    },
  )}`;

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: nonCompliantTitle,
    summary: nonCompliantSummary,
    description: nonCompliantDescription,
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(createdProduct);

  // 4. Admin joins the platform
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoinOutput);

  // 5. Admin login to establish admin context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginOutput);

  // 6. Admin remediates the product via admin update endpoint
  const compliantTitle = `COMPLIANT PRODUCT ${RandomGenerator.paragraph({
    sentences: 2,
  })}`;
  const compliantSummary = `COMPLIANT SUMMARY ${RandomGenerator.paragraph({
    sentences: 3,
  })}`;
  const compliantDescription = `This description has been remediated to comply with policy. ${RandomGenerator.content(
    {
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    },
  )}`;

  const updatedStatus = "admin_unpublished";

  const adminUpdateBody = {
    title: compliantTitle,
    summary: compliantSummary,
    description: compliantDescription,
    status: updatedStatus,
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.update(connection, {
      productId: createdProduct.id,
      body: adminUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(updatedProduct);

  // 7. Assertions and validations
  // 7-1. Identity and ownership stay the same
  TestValidator.equals(
    "updated product id should match original id",
    updatedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "seller ownership must remain unchanged",
    updatedProduct.shopping_mall_seller_id,
    createdProduct.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "product code must remain unchanged",
    updatedProduct.code,
    createdProduct.code,
  );

  // 7-2. Descriptive fields reflect admin remediation
  TestValidator.equals(
    "title must be updated to compliant value",
    updatedProduct.title,
    compliantTitle,
  );
  TestValidator.equals(
    "summary must be updated to compliant value",
    updatedProduct.summary,
    compliantSummary,
  );
  TestValidator.equals(
    "description must be updated to compliant value",
    updatedProduct.description,
    compliantDescription,
  );
  TestValidator.equals(
    "status must reflect admin enforcement state",
    updatedProduct.status,
    updatedStatus,
  );

  // 7-3. Ensure at least one field actually changed vs original (description)
  TestValidator.notEquals(
    "description should differ from original non-compliant content",
    updatedProduct.description,
    createdProduct.description,
  );
}
