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
 * Validate that an admin can create and then erase a global catalog visibility
 * rule.
 *
 * Business goal:
 *
 * - Ensure that a visibility rule with no seller/product/SKU scope (truly global)
 *   can be created via the admin API and subsequently erased via the erase API,
 *   such that it is no longer retrievable.
 *
 * High-level steps:
 *
 * 1. Join as a fresh admin to obtain an authenticated admin context.
 * 2. Create a global catalog visibility rule with enabled=true and
 *    rule_type="hide".
 * 3. Verify the created rule has a non-empty id, enabled=true, rule_type matches,
 *    and all scope fields (seller/product/sku) are null/undefined.
 * 4. Erase the rule using its id; ensure the erase call completes without error.
 * 5. Attempt to re-fetch the rule; expect an error, asserting only that an error
 *    is thrown (not any specific HTTP status).
 */
export async function test_api_catalog_visibility_rule_erase_global_rule_by_admin(
  connection: api.IConnection,
) {
  // 1. Join as a fresh admin to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a global catalog visibility rule (no seller/product/SKU scope)
  const createBody = {
    rule_type: "hide",
    enabled: true,
    actor_type: null,
    region_code: null,
    starts_at: null,
    ends_at: null,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: null,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const createdRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdRule);

  // 3. Business assertions on created rule
  TestValidator.predicate(
    "created global rule should be enabled",
    createdRule.enabled === true,
  );
  TestValidator.equals(
    "created global rule rule_type should match input",
    createdRule.rule_type,
    createBody.rule_type,
  );
  TestValidator.equals(
    "seller scope should be null for global rule",
    createdRule.shopping_mall_seller_id ?? null,
    null,
  );
  TestValidator.equals(
    "product scope should be null for global rule",
    createdRule.shopping_mall_product_id ?? null,
    null,
  );
  TestValidator.equals(
    "sku scope should be null for global rule",
    createdRule.shopping_mall_sku_id ?? null,
    null,
  );

  // 4. Erase the created rule
  await api.functional.shoppingMall.admin.catalogVisibilityRules.erase(
    connection,
    { catalogVisibilityRuleId: createdRule.id },
  );

  // 5. Attempt to re-fetch the rule; expect an error (e.g., not found)
  await TestValidator.error(
    "erased catalog visibility rule should no longer be retrievable",
    async () => {
      await api.functional.shoppingMall.admin.catalogVisibilityRules.at(
        connection,
        { catalogVisibilityRuleId: createdRule.id },
      );
    },
  );
}
