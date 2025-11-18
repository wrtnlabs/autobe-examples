import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogVisibilityRule";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validate creation of a global catalog visibility rule that hides products
 * from guest users.
 *
 * Business goals:
 *
 * - Ensure that an authenticated admin can create a visibility rule using POST
 *   /shoppingMall/admin/catalogVisibilityRules.
 * - The created rule must be _global_ (no seller/product/sku scope), target guest
 *   users, and be enabled.
 * - The rule must be associated with the creating admin, and optional fields
 *   omitted in the request should appear as null/undefined per DTO rules.
 *
 * End-to-end flow:
 *
 * 1. Admin joins the platform via POST /auth/admin/join to obtain
 *    IShoppingMallAdmin.IAuthorized and initialize the Authorization header on
 *    the shared connection.
 * 2. Using the authenticated admin connection, call
 *    api.functional.shoppingMall.admin.catalogVisibilityRules.create with a
 *    body of type IShoppingMallCatalogVisibilityRule.ICreate representing a
 *    global "hide for guests" rule.
 * 3. Assert the response structure with typia.assert.
 * 4. Check that shopping_mall_admin_id equals the admin.id from the join response.
 * 5. Validate that:
 *
 *    - Rule_type === "hide" (business-chosen literal for this test),
 *    - Actor_type === "guestUser",
 *    - Enabled === true,
 *    - All scoping fields (shopping_mall_seller_id, shopping_mall_product_id,
 *         shopping_mall_sku_id) are null or undefined,
 *    - Temporal/region/reason fields (region_code, starts_at, ends_at, reason) are
 *         null or undefined.
 */
export async function test_api_catalog_visibility_rule_create_global_hide_guests(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform to obtain an authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a global catalog visibility rule hiding all products from guests
  const createBody = {
    rule_type: "hide",
    actor_type: "guestUser",
    enabled: true,
    region_code: null,
    starts_at: null,
    ends_at: null,
    reason: null,
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: null,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const createdRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(createdRule);

  // 3. Assert ownership: rule must belong to the authenticated admin
  TestValidator.equals(
    "visibility rule should be owned by the creating admin",
    createdRule.shopping_mall_admin_id,
    adminAuthorized.id,
  );

  // 4. Assert rule core attributes
  TestValidator.equals(
    "rule_type must be 'hide' for this test",
    createdRule.rule_type,
    createBody.rule_type,
  );
  TestValidator.equals(
    "actor_type must persist as 'guestUser'",
    createdRule.actor_type,
    createBody.actor_type,
  );
  TestValidator.equals(
    "enabled flag must persist as true",
    createdRule.enabled,
    true,
  );

  // 5. Assert scoping fields: global rule => no seller/product/sku scope
  TestValidator.equals(
    "seller scope must be null or undefined for global rule",
    createdRule.shopping_mall_seller_id ?? null,
    null,
  );
  TestValidator.equals(
    "product scope must be null or undefined for global rule",
    createdRule.shopping_mall_product_id ?? null,
    null,
  );
  TestValidator.equals(
    "SKU scope must be null or undefined for global rule",
    createdRule.shopping_mall_sku_id ?? null,
    null,
  );

  // 6. Assert other optional fields we intentionally omitted in the request
  TestValidator.equals(
    "region_code must be null or undefined when not provided",
    createdRule.region_code ?? null,
    null,
  );
  TestValidator.equals(
    "starts_at must be null or undefined when not provided",
    createdRule.starts_at ?? null,
    null,
  );
  TestValidator.equals(
    "ends_at must be null or undefined when not provided",
    createdRule.ends_at ?? null,
    null,
  );
  TestValidator.equals(
    "reason must be null or undefined when not provided",
    createdRule.reason ?? null,
    null,
  );

  // 7. Sanity check: admin summary object, if present, should match ids
  if (createdRule.admin !== undefined) {
    typia.assert<IShoppingMallAdmin.ISummary>(createdRule.admin);
    TestValidator.equals(
      "embedded admin summary id should match shopping_mall_admin_id",
      createdRule.admin.id,
      createdRule.shopping_mall_admin_id,
    );
  }
}
