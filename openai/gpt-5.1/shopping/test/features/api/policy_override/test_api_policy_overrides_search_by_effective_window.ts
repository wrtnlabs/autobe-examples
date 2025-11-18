import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicyOverride";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverride";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_policy_overrides_search_by_effective_window(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;
  const businessPolicyBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: businessPolicyBody,
      },
    );
  typia.assert(businessPolicy);

  // 3. Create a concrete active policy version for that policy
  const now = new Date();
  const recentPast = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

  const policyVersionBody = {
    version_code: "v1",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: recentPast.toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: policyVersionBody,
      },
    );
  typia.assert(policyVersion);

  // 4. Create two overrides (A in-window, B out-of-window)
  const windowFromDate = now;
  const windowToDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const windowFrom = windowFromDate.toISOString();
  const windowTo = windowToDate.toISOString();

  // Override A: inside reporting window [windowFrom, windowTo]
  const overrideABody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "global",
    subject_id: null,
    subject_display: "global-scope",
    override_code: "refund_window",
    override_value: "7_days",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    effective_from: windowFrom,
    effective_until: windowTo,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const overrideA: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideABody,
    });
  typia.assert(overrideA);

  // Override B: 60-50 days ago, completely outside the near-term window
  const bFromDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const bToDate = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);

  const overrideBBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "global",
    subject_id: null,
    subject_display: "global-scope-old",
    override_code: "refund_window",
    override_value: "old_override",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    effective_from: bFromDate.toISOString(),
    effective_until: bToDate.toISOString(),
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const overrideB: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideBBody,
    });
  typia.assert(overrideB);

  // 5. Search with reporting window [windowFrom, windowTo]
  const searchRequestWithinWindow = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: null,
    subject_type: null,
    subject_id: null,
    override_code: null,
    effective_from_from: windowFrom,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: windowTo,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const pageWithinWindow: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.policyOverrides.index(connection, {
      body: searchRequestWithinWindow,
    });
  typia.assert(pageWithinWindow);

  const idsWithin = pageWithinWindow.data.map((o) => o.id);

  TestValidator.predicate(
    "override A should be included in window search",
    idsWithin.includes(overrideA.id),
  );
  TestValidator.predicate(
    "override B should be excluded from window search",
    idsWithin.includes(overrideB.id) === false,
  );

  TestValidator.predicate(
    "pagination current page is 1",
    pageWithinWindow.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records should be >= data length",
    pageWithinWindow.pagination.records >= pageWithinWindow.data.length,
  );

  // 6. Second search with wide time range (no effective window constraints)
  const searchRequestAll = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: null,
    subject_type: null,
    subject_id: null,
    override_code: null,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const pageAll: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.policyOverrides.index(connection, {
      body: searchRequestAll,
    });
  typia.assert(pageAll);

  const allIds = pageAll.data.map((o) => o.id);

  TestValidator.predicate(
    "override A should be present in wide search",
    allIds.includes(overrideA.id),
  );
  TestValidator.predicate(
    "override B should be present in wide search",
    allIds.includes(overrideB.id),
  );
}
