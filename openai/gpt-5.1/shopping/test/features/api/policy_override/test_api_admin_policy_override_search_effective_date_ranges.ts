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

export async function test_api_admin_policy_override_search_effective_date_ranges(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare deterministic effective windows relative to now
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const pastFrom = new Date(now.getTime() - 3 * dayMs).toISOString();
  const pastUntil = new Date(now.getTime() - 2 * dayMs).toISOString();

  const activeFrom = new Date(now.getTime() - 1 * dayMs).toISOString();
  const activeUntil = new Date(now.getTime() + 1 * dayMs).toISOString();

  const futureFrom = new Date(now.getTime() + 2 * dayMs).toISOString();
  const futureUntil = new Date(now.getTime() + 3 * dayMs).toISOString();

  const policyVersionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Common override fields
  const subjectType = "global";
  const overrideCode = "test_effective_window";

  // 3. Create three overrides with different windows
  const pastOverrideCreate = {
    shopping_mall_policy_version_id: policyVersionId,
    subject_type: subjectType,
    subject_id: null,
    subject_display: "Global past override",
    override_code: overrideCode,
    override_value: "past-value",
    reason: "Past-only window for testing",
    status: "active",
    effective_from: pastFrom,
    effective_until: pastUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const pastOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: pastOverrideCreate,
    });
  typia.assert(pastOverride);

  const activeOverrideCreate = {
    shopping_mall_policy_version_id: policyVersionId,
    subject_type: subjectType,
    subject_id: null,
    subject_display: "Global active override",
    override_code: overrideCode,
    override_value: "active-value",
    reason: "Currently active window for testing",
    status: "active",
    effective_from: activeFrom,
    effective_until: activeUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const activeOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: activeOverrideCreate,
    });
  typia.assert(activeOverride);

  const futureOverrideCreate = {
    shopping_mall_policy_version_id: policyVersionId,
    subject_type: subjectType,
    subject_id: null,
    subject_display: "Global future override",
    override_code: overrideCode,
    override_value: "future-value",
    reason: "Future-only window for testing",
    status: "active",
    effective_from: futureFrom,
    effective_until: futureUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const futureOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: futureOverrideCreate,
    });
  typia.assert(futureOverride);

  // Helper to find IDs in result set
  const extractIds = (
    page: IPageIShoppingMallPolicyOverride.ISummary,
  ): (string & tags.Format<"uuid">)[] => page.data.map((o) => o.id);

  // 4-a. Search for currently effective overrides around "now"
  const currentWindowRequest = {
    page: 1,
    limit: 20,
    status: "active",
    subject_type: subjectType,
    subject_id: null,
    override_code: overrideCode,
    effective_from_from: pastUntil,
    effective_from_to: futureFrom,
    effective_until_from: pastUntil,
    effective_until_to: futureFrom,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const currentWindowPage: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.policyOverrides.index(
      connection,
      { body: currentWindowRequest },
    );
  typia.assert(currentWindowPage);

  const currentIds = extractIds(currentWindowPage);

  TestValidator.predicate(
    "current window search should return at least the active override",
    currentIds.includes(activeOverride.id),
  );

  TestValidator.predicate(
    "current window search should not return past override",
    currentIds.includes(pastOverride.id) === false,
  );

  TestValidator.predicate(
    "current window search should not return future override",
    currentIds.includes(futureOverride.id) === false,
  );

  // 4-b. Search for pure past window that matches only the past override
  const pastWindowRequest = {
    page: 1,
    limit: 20,
    status: "active",
    subject_type: subjectType,
    subject_id: null,
    override_code: overrideCode,
    effective_from_from: pastFrom,
    effective_from_to: pastUntil,
    effective_until_from: pastFrom,
    effective_until_to: pastUntil,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const pastWindowPage: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.policyOverrides.index(
      connection,
      { body: pastWindowRequest },
    );
  typia.assert(pastWindowPage);

  const pastIds = extractIds(pastWindowPage);

  TestValidator.predicate(
    "past window search should include past override",
    pastIds.includes(pastOverride.id),
  );
  TestValidator.predicate(
    "past window search should not include active override",
    pastIds.includes(activeOverride.id) === false,
  );
  TestValidator.predicate(
    "past window search should not include future override",
    pastIds.includes(futureOverride.id) === false,
  );

  // 4-c. Search for pure future window that matches only the future override
  const futureWindowRequest = {
    page: 1,
    limit: 20,
    status: "active",
    subject_type: subjectType,
    subject_id: null,
    override_code: overrideCode,
    effective_from_from: futureFrom,
    effective_from_to: futureUntil,
    effective_until_from: futureFrom,
    effective_until_to: futureUntil,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const futureWindowPage: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.policyOverrides.index(
      connection,
      { body: futureWindowRequest },
    );
  typia.assert(futureWindowPage);

  const futureIds = extractIds(futureWindowPage);

  TestValidator.predicate(
    "future window search should include future override",
    futureIds.includes(futureOverride.id),
  );
  TestValidator.predicate(
    "future window search should not include active override",
    futureIds.includes(activeOverride.id) === false,
  );
  TestValidator.predicate(
    "future window search should not include past override",
    futureIds.includes(pastOverride.id) === false,
  );
}
