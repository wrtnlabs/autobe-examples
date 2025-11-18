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
 * Validate toggling the `enabled` flag of a catalog visibility rule from true
 * to false.
 *
 * Business context:
 *
 * - Catalog visibility rules drive which products/SKUs are visible to which
 *   actors.
 * - Admins must be able to disable a rule without changing its scope or other
 *   metadata.
 * - Updates are partial via IShoppingMallCatalogVisibilityRule.IUpdate;
 *   unspecified fields must remain unchanged.
 *
 * Scenario steps:
 *
 * 1. Admin joins (POST /auth/admin/join) to obtain an authenticated admin context.
 * 2. Admin creates a basic, global catalog visibility rule with enabled=true.
 * 3. Admin updates that rule via PUT
 *    /shoppingMall/admin/catalogVisibilityRules/{catalogVisibilityRuleId}
 *    sending an IShoppingMallCatalogVisibilityRule.IUpdate body with only
 *    `enabled: false`.
 * 4. Assert that:
 *
 *    - The returned rule has the same id as the original.
 *    - `enabled` has changed from true to false.
 *    - All other business fields are unchanged (rule_type, actor_type, region_code,
 *         shopping_mall_seller_id, shopping_mall_product_id,
 *         shopping_mall_sku_id, starts_at, ends_at, reason, deleted_at).
 *    - `created_at` remains identical, while `updated_at` is strictly later than the
 *         original `updated_at`.
 *    - The rule is not soft-deleted (deleted_at remains null or unchanged).
 */
export async function test_api_catalog_visibility_rule_update_toggle_enabled_flag(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates a basic, global visibility rule with enabled=true.
  const createBody = {
    rule_type: "hide",
    actor_type: null,
    region_code: null,
    enabled: true,
    starts_at: null,
    ends_at: null,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
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

  // Sanity checks on the created rule.
  TestValidator.predicate(
    "created rule must be enabled=true",
    createdRule.enabled === true,
  );
  TestValidator.equals(
    "created rule_type must match request",
    createdRule.rule_type,
    createBody.rule_type,
  );

  // Capture original snapshot for later comparison.
  const originalRule: IShoppingMallCatalogVisibilityRule = createdRule;

  // 3. Update only the enabled flag to false via partial update.
  const updateBody = {
    enabled: false,
  } satisfies IShoppingMallCatalogVisibilityRule.IUpdate;

  const updatedRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.update(
      connection,
      {
        catalogVisibilityRuleId: originalRule.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(updatedRule);

  // 4-a. Id must remain the same.
  TestValidator.equals(
    "updated rule id must equal original id",
    updatedRule.id,
    originalRule.id,
  );

  // 4-b. enabled must toggle from true to false.
  TestValidator.predicate(
    "enabled flag must be changed to false",
    originalRule.enabled === true && updatedRule.enabled === false,
  );

  // 4-c. Unchanged business fields.
  TestValidator.equals(
    "rule_type should remain unchanged",
    updatedRule.rule_type,
    originalRule.rule_type,
  );
  TestValidator.equals(
    "actor_type should remain unchanged",
    updatedRule.actor_type ?? null,
    originalRule.actor_type ?? null,
  );
  TestValidator.equals(
    "region_code should remain unchanged",
    updatedRule.region_code ?? null,
    originalRule.region_code ?? null,
  );
  TestValidator.equals(
    "shopping_mall_seller_id should remain unchanged",
    updatedRule.shopping_mall_seller_id ?? null,
    originalRule.shopping_mall_seller_id ?? null,
  );
  TestValidator.equals(
    "shopping_mall_product_id should remain unchanged",
    updatedRule.shopping_mall_product_id ?? null,
    originalRule.shopping_mall_product_id ?? null,
  );
  TestValidator.equals(
    "shopping_mall_sku_id should remain unchanged",
    updatedRule.shopping_mall_sku_id ?? null,
    originalRule.shopping_mall_sku_id ?? null,
  );
  TestValidator.equals(
    "starts_at should remain unchanged",
    updatedRule.starts_at ?? null,
    originalRule.starts_at ?? null,
  );
  TestValidator.equals(
    "ends_at should remain unchanged",
    updatedRule.ends_at ?? null,
    originalRule.ends_at ?? null,
  );
  TestValidator.equals(
    "reason should remain unchanged",
    updatedRule.reason ?? null,
    originalRule.reason ?? null,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged (rule not soft-deleted)",
    updatedRule.deleted_at ?? null,
    originalRule.deleted_at ?? null,
  );

  // 4-d. created_at unchanged, updated_at strictly later.
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedRule.created_at,
    originalRule.created_at,
  );

  const originalUpdatedAtMs = new Date(originalRule.updated_at).getTime();
  const updatedUpdatedAtMs = new Date(updatedRule.updated_at).getTime();

  TestValidator.predicate(
    "updated_at must be strictly later than original updated_at",
    updatedUpdatedAtMs > originalUpdatedAtMs,
  );
}
