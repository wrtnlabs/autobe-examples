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

/**
 * Verify that an admin can search policy overrides filtered by subject and
 * status.
 *
 * Business flow:
 *
 * 1. Join an admin account to obtain admin authorization.
 * 2. Create a base business policy (e.g., refund-related) that will own versions.
 * 3. Create a concrete active policy version under that business policy.
 * 4. Create an ACTIVE policy override targeting a specific subject_type/subject_id
 *    pair.
 * 5. Call PATCH /shoppingMall/admin/policyOverrides with filters on subject_type,
 *    subject_id and status="active".
 *
 *    - Assert that the created override is returned.
 *    - Assert that pagination metadata is consistent with the data length.
 *    - Assert that policyVersion in each summary refers to the same version id we
 *         created.
 * 6. Create a second override for the same subject with a different status (e.g.,
 *    "expired").
 * 7. Re-query with status="active" and ensure the second override is excluded.
 * 8. Query again with status=null (no status constraint) and ensure both overrides
 *    are present.
 */
export async function test_api_policy_overrides_search_by_subject_and_status(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain admin context and tokens.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a base business policy.
  const policyCode: string = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const createPolicyBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createPolicyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(businessPolicy);
  TestValidator.equals(
    "created policy_code should match input",
    businessPolicy.policy_code,
    policyCode,
  );

  // 3. Create an active policy version for that policy.
  const versionCode: string = `v_${RandomGenerator.alphaNumeric(6)}`;
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const createVersionBody = {
    version_code: versionCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ refund_days: 30 }),
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: createVersionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);
  TestValidator.equals(
    "created version_code should match input",
    policyVersion.version_code,
    versionCode,
  );

  // 4. Create an ACTIVE policy override bound to this version for a concrete subject.
  const subjectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const subjectType = "seller";
  const subjectDisplay = RandomGenerator.name();
  const overrideCode = "refund_window_days";

  const activeOverrideBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: subjectType,
    subject_id: subjectId,
    subject_display: subjectDisplay,
    override_code: overrideCode,
    override_value: "45",
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const activeOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: activeOverrideBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(activeOverride);

  TestValidator.equals(
    "active override should reference the created policy version",
    activeOverride.shopping_mall_policy_version_id,
    policyVersion.id,
  );
  TestValidator.equals(
    "active override subject_type should match",
    activeOverride.subject_type,
    subjectType,
  );
  TestValidator.equals(
    "active override subject_id should match",
    activeOverride.subject_id,
    subjectId,
  );
  TestValidator.equals(
    "active override status should be active",
    activeOverride.status,
    "active",
  );

  // 5. Search overrides by subject_type, subject_id, and status="active".
  const firstSearchBody = {
    page: 1,
    limit: 10,
    status: "active",
    subject_type: subjectType,
    subject_id: subjectId,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const firstPage: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.policyOverrides.index(connection, {
      body: firstSearchBody,
    });
  typia.assert<IPageIShoppingMallPolicyOverride.ISummary>(firstPage);

  const pagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination);
  TestValidator.predicate(
    "pagination.records must be >= data.length",
    pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "pagination.limit must be >= data.length",
    pagination.limit >= firstPage.data.length,
  );

  const foundActive = firstPage.data.find(
    (row) => row.id === activeOverride.id,
  );
  TestValidator.predicate(
    "active override should be returned when filtering by subject and active status",
    !!foundActive,
  );

  if (foundActive) {
    typia.assert<IShoppingMallPolicyOverride.ISummary>(foundActive);
    TestValidator.equals(
      "foundActive.subject_type matches filter",
      foundActive.subject_type,
      subjectType,
    );
    TestValidator.equals(
      "foundActive.subject_id matches filter",
      foundActive.subject_id,
      subjectId,
    );
    TestValidator.equals(
      "foundActive.status is active",
      foundActive.status,
      "active",
    );
    TestValidator.equals(
      "foundActive.override_code matches created one",
      foundActive.override_code,
      overrideCode,
    );
    TestValidator.equals(
      "foundActive.override_value matches created one",
      foundActive.override_value,
      activeOverride.override_value,
    );
    TestValidator.equals(
      "foundActive.policyVersion id matches the created version",
      foundActive.policyVersion.id,
      policyVersion.id,
    );
  }

  // 6. Create a second override for the same subject with a different status (e.g., expired).
  const expiredOverrideBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: subjectType,
    subject_id: subjectId,
    subject_display: subjectDisplay,
    override_code: overrideCode,
    override_value: "15",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: "expired",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const expiredOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: expiredOverrideBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(expiredOverride);

  TestValidator.equals(
    "expired override should have status expired",
    expiredOverride.status,
    "expired",
  );

  // 7. Re-query with status="active" and ensure the expired override is excluded.
  const secondPage: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.policyOverrides.index(connection, {
      body: firstSearchBody,
    });
  typia.assert<IPageIShoppingMallPolicyOverride.ISummary>(secondPage);

  const hasActiveAgain = secondPage.data.some(
    (row) => row.id === activeOverride.id,
  );
  const hasExpiredInActiveSearch = secondPage.data.some(
    (row) => row.id === expiredOverride.id,
  );

  TestValidator.predicate(
    "active override still appears in active-only search",
    hasActiveAgain,
  );
  TestValidator.predicate(
    "expired override should not appear when status filter is active",
    !hasExpiredInActiveSearch,
  );

  // 8. Query again with status=null (no status constraint) and ensure both overrides are present.
  const broadSearchBody = {
    page: 1,
    limit: 10,
    status: null,
    subject_type: subjectType,
    subject_id: subjectId,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const broadPage: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.policyOverrides.index(connection, {
      body: broadSearchBody,
    });
  typia.assert<IPageIShoppingMallPolicyOverride.ISummary>(broadPage);

  const hasActiveInBroad = broadPage.data.some(
    (row) => row.id === activeOverride.id,
  );
  const hasExpiredInBroad = broadPage.data.some(
    (row) => row.id === expiredOverride.id,
  );

  TestValidator.predicate(
    "active override should appear when status filter is null",
    hasActiveInBroad,
  );
  TestValidator.predicate(
    "expired override should also appear when status filter is null",
    hasExpiredInBroad,
  );
}
