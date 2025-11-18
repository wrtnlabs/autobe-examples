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

export async function test_api_catalog_visibility_rule_update_adjust_time_window_and_region(
  connection: api.IConnection,
) {
  // 1) Admin joins (registration + implicit authentication)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
    ip: "192.168.0.1" as string & (tags.Format<"ipv4"> | tags.Format<"ipv6">),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2) Create initial visibility rule
  const now = new Date();
  const initialStart = new Date(now.getTime() + 60 * 60 * 1000); // +1h
  const initialEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h

  const createBody = {
    rule_type: "region_restricted",
    actor_type: "customer",
    region_code: "KR",
    enabled: true,
    starts_at: initialStart.toISOString(),
    ends_at: initialEnd.toISOString(),
    reason: "Initial Korea-only visibility window",
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: null,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const createdRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(createdRule);

  // 3) Update the rule: change region_code, time window, and reason
  const newStart = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3h
  const newEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000); // +4h

  const updateBody = {
    region_code: "US",
    starts_at: newStart.toISOString(),
    ends_at: newEnd.toISOString(),
    reason: "US campaign window adjustment",
  } satisfies IShoppingMallCatalogVisibilityRule.IUpdate;

  const updatedRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.update(
      connection,
      {
        catalogVisibilityRuleId: createdRule.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(updatedRule);

  // 4) Business validations on update result
  // 4-1) Identity and immutable fields stay the same
  TestValidator.equals(
    "rule id should remain identical after update",
    updatedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "shopping_mall_admin_id should not change",
    updatedRule.shopping_mall_admin_id,
    createdRule.shopping_mall_admin_id,
  );
  TestValidator.equals(
    "rule_type should not change on simple region/time update",
    updatedRule.rule_type,
    createdRule.rule_type,
  );
  TestValidator.equals(
    "actor_type should not change on simple region/time update",
    updatedRule.actor_type,
    createdRule.actor_type,
  );
  TestValidator.equals(
    "enabled flag should remain the same",
    updatedRule.enabled,
    createdRule.enabled,
  );
  TestValidator.equals(
    "seller scope should remain unchanged",
    updatedRule.shopping_mall_seller_id ?? null,
    createdRule.shopping_mall_seller_id ?? null,
  );
  TestValidator.equals(
    "product scope should remain unchanged",
    updatedRule.shopping_mall_product_id ?? null,
    createdRule.shopping_mall_product_id ?? null,
  );
  TestValidator.equals(
    "sku scope should remain unchanged",
    updatedRule.shopping_mall_sku_id ?? null,
    createdRule.shopping_mall_sku_id ?? null,
  );

  // 4-2) Region and time window, reason must reflect updated values
  TestValidator.equals(
    "region_code should be updated to new region",
    updatedRule.region_code,
    updateBody.region_code,
  );
  TestValidator.equals(
    "starts_at should be updated to new start",
    updatedRule.starts_at,
    updateBody.starts_at,
  );
  TestValidator.equals(
    "ends_at should be updated to new end",
    updatedRule.ends_at,
    updateBody.ends_at,
  );
  TestValidator.equals(
    "reason should be updated",
    updatedRule.reason,
    updateBody.reason,
  );

  // 4-3) created_at must be unchanged, updated_at must advance
  TestValidator.equals(
    "created_at must remain the same after update",
    updatedRule.created_at,
    createdRule.created_at,
  );
  TestValidator.predicate("updated_at should be later than before", () => {
    const before = new Date(createdRule.updated_at).getTime();
    const after = new Date(updatedRule.updated_at).getTime();
    return after >= before && (after === before ? false : true);
  });

  // 5) Negative-path: invalid time window (starts_at > ends_at) must be rejected
  const invalidStart = new Date(now.getTime() + 10 * 60 * 60 * 1000); // +10h
  const invalidEnd = new Date(now.getTime() + 9 * 60 * 60 * 1000); // +9h

  const invalidUpdateBody = {
    starts_at: invalidStart.toISOString(),
    ends_at: invalidEnd.toISOString(),
  } satisfies IShoppingMallCatalogVisibilityRule.IUpdate;

  await TestValidator.error(
    "invalid time window update should fail",
    async () => {
      await api.functional.shoppingMall.admin.catalogVisibilityRules.update(
        connection,
        {
          catalogVisibilityRuleId: createdRule.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
}
