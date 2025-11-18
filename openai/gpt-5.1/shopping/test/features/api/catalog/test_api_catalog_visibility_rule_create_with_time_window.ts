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
 * Validate creation of time-windowed catalog visibility rules by an admin.
 *
 * Business context:
 *
 * - Platform admins define catalog visibility rules controlling which
 *   products/SKUs are visible under certain conditions.
 * - Some rules are temporary "campaign" rules that should only apply between
 *   explicit start and end timestamps and can be global (not scoped to
 *   seller/product/SKU).
 *
 * This test verifies that:
 *
 * 1. An admin can join (register) and immediately obtain an authorized context.
 * 2. The admin can create a visibility rule with:
 *
 *    - Rule_type representing a promotional campaign.
 *    - Enabled=true.
 *    - Starts_at and ends_at forming a valid future time window (ends_at >
 *         starts_at).
 *    - Reason describing the campaign.
 *    - No seller/product/sku scoping (global rule).
 * 3. The API echoes these values in the created IShoppingMallCatalogVisibilityRule
 *    entity.
 * 4. Creating a rule where ends_at is earlier than starts_at is rejected as a
 *    business validation error while still using type-correct date-time
 *    strings.
 */
export async function test_api_catalog_visibility_rule_create_with_time_window(
  connection: api.IConnection,
) {
  // 1. Admin joins (register) to obtain authorized context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Use realistic URIs for href and referrer
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/login",
    // Omit ip so that backend can derive it, exercising optional field behavior
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a valid time-windowed visibility rule.
  const now = new Date();
  const startsDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const endsDate = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25 hours

  const startsAt = startsDate.toISOString();
  const endsAt = endsDate.toISOString();

  const createBodyValid = {
    rule_type: "campaign_promo",
    actor_type: null,
    region_code: null,
    enabled: true,
    starts_at: startsAt,
    ends_at: endsAt,
    reason: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: null,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  const createdRule: IShoppingMallCatalogVisibilityRule =
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: createBodyValid,
      },
    );
  typia.assert<IShoppingMallCatalogVisibilityRule>(createdRule);

  // 2-1. Verify time window and main attributes.
  TestValidator.equals(
    "visibility rule created with correct starts_at",
    createdRule.starts_at,
    createBodyValid.starts_at,
  );
  TestValidator.equals(
    "visibility rule created with correct ends_at",
    createdRule.ends_at,
    createBodyValid.ends_at,
  );
  TestValidator.equals(
    "visibility rule created with correct rule_type",
    createdRule.rule_type,
    createBodyValid.rule_type,
  );
  TestValidator.equals("visibility rule is enabled", createdRule.enabled, true);
  TestValidator.equals(
    "visibility rule created with correct reason",
    createdRule.reason,
    createBodyValid.reason,
  );

  // 2-2. Ensure ends_at > starts_at in chronological order.
  const createdStartsAt = createdRule.starts_at ?? undefined;
  const createdEndsAt = createdRule.ends_at ?? undefined;

  if (createdStartsAt !== undefined && createdEndsAt !== undefined) {
    const createdStartsDate = new Date(createdStartsAt);
    const createdEndsDate = new Date(createdEndsAt);

    TestValidator.predicate(
      "visibility rule ends_at is later than starts_at",
      createdEndsDate.getTime() > createdStartsDate.getTime(),
    );
  }

  // 2-3. Verify rule is global (not scoped to seller/product/sku).
  TestValidator.equals(
    "visibility rule is global seller scope",
    createdRule.shopping_mall_seller_id ?? null,
    null,
  );
  TestValidator.equals(
    "visibility rule is global product scope",
    createdRule.shopping_mall_product_id ?? null,
    null,
  );
  TestValidator.equals(
    "visibility rule is global sku scope",
    createdRule.shopping_mall_sku_id ?? null,
    null,
  );

  // 3. Attempt to create an invalid rule where ends_at < starts_at.
  const invalidStartsDate = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25 hours
  const invalidEndsDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

  const invalidCreateBody = {
    rule_type: "campaign_promo",
    actor_type: null,
    region_code: null,
    enabled: true,
    starts_at: invalidStartsDate.toISOString(),
    ends_at: invalidEndsDate.toISOString(),
    reason: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 10,
    }),
    shopping_mall_seller_id: null,
    shopping_mall_product_id: null,
    shopping_mall_sku_id: null,
  } satisfies IShoppingMallCatalogVisibilityRule.ICreate;

  await TestValidator.error("invalid time window is rejected", async () => {
    await api.functional.shoppingMall.admin.catalogVisibilityRules.create(
      connection,
      {
        body: invalidCreateBody,
      },
    );
  });
}
