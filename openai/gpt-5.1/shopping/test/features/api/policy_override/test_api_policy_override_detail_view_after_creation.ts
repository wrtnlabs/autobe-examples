import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverride";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate that an admin can view the full detail of a newly created policy
 * override.
 *
 * Business workflow:
 *
 * 1. Register a new admin account using the join endpoint to obtain an
 *    authenticated admin context.
 * 2. As that admin, create a base business policy which will own one or more
 *    versions.
 * 3. Under that policy, create a concrete policy version with explicit lifecycle
 *    and content fields.
 * 4. Create a policy override that targets the created policy version for a
 *    specific subject.
 * 5. Immediately read the override detail by its id and verify that the payload
 *    reflects what was created.
 *
 * This test focuses on the happy-path read scenario and verifies structural
 * correctness and consistency between the created override and its fetched
 * representation, including embedded policyVersion and createdByAdmin
 * summaries.
 */
export async function test_api_policy_override_detail_view_after_creation(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create base business policy
  const policyCreateBody = {
    policy_code: `refund_${RandomGenerator.alphaNumeric(8)}`,
    name: `Refund Policy ${RandomGenerator.name(2)}`,
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(businessPolicy);

  // 3. Create a concrete policy version under this policy
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const futureIso: string & tags.Format<"date-time"> = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const policyVersionCreateBody = {
    version_code: "v1",
    title: "Initial refund policy version",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ refundWindowDays: 14 }),
    status: "active",
    effective_from: nowIso,
    effective_until: futureIso,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policyCreateBody.policy_code,
        body: policyVersionCreateBody,
      },
    );
  typia.assert(policyVersion);

  // 4. Create a new policy override targeting this policy version
  const subjectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const overrideEffectiveFrom: string & tags.Format<"date-time"> = nowIso;
  const overrideEffectiveUntil: (string & tags.Format<"date-time">) | null =
    null;

  const overrideCreateBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "seller",
    subject_id: subjectId,
    subject_display: "Test Seller Display Name",
    override_code: "refund_window_days",
    override_value: "30",
    reason: "Special promotion for selected seller",
    status: "active",
    effective_from: overrideEffectiveFrom,
    effective_until: overrideEffectiveUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const createdOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody,
    });
  typia.assert(createdOverride);

  // 5. Fetch the override by id and validate details
  const fetchedOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.at(connection, {
      policyOverrideId: createdOverride.id,
    });
  typia.assert(fetchedOverride);

  // Basic identity and core field checks
  TestValidator.equals(
    "override id should match",
    fetchedOverride.id,
    createdOverride.id,
  );

  TestValidator.equals(
    "policy version id should match",
    fetchedOverride.shopping_mall_policy_version_id,
    overrideCreateBody.shopping_mall_policy_version_id,
  );

  TestValidator.equals(
    "subject_type should match",
    fetchedOverride.subject_type,
    overrideCreateBody.subject_type,
  );

  TestValidator.equals(
    "subject_id should match",
    fetchedOverride.subject_id ?? null,
    overrideCreateBody.subject_id ?? null,
  );

  TestValidator.equals(
    "subject_display should match",
    fetchedOverride.subject_display ?? null,
    overrideCreateBody.subject_display ?? null,
  );

  TestValidator.equals(
    "override_code should match",
    fetchedOverride.override_code,
    overrideCreateBody.override_code,
  );

  TestValidator.equals(
    "override_value should match",
    fetchedOverride.override_value,
    overrideCreateBody.override_value,
  );

  TestValidator.equals(
    "reason should match",
    fetchedOverride.reason ?? null,
    overrideCreateBody.reason ?? null,
  );

  TestValidator.equals(
    "status should match",
    fetchedOverride.status,
    overrideCreateBody.status,
  );

  TestValidator.equals(
    "effective_from should match",
    fetchedOverride.effective_from ?? null,
    overrideCreateBody.effective_from ?? null,
  );

  TestValidator.equals(
    "effective_until should match",
    fetchedOverride.effective_until ?? null,
    overrideCreateBody.effective_until ?? null,
  );

  // deleted_at should represent non-soft-deleted record
  TestValidator.predicate(
    "deleted_at should be null or undefined (not soft-deleted)",
    fetchedOverride.deleted_at === null ||
      fetchedOverride.deleted_at === undefined,
  );

  // Embedded policyVersion consistency (when present)
  if (fetchedOverride.policyVersion !== undefined) {
    const embeddedVersion = fetchedOverride.policyVersion;

    TestValidator.equals(
      "embedded policyVersion id should match created version",
      embeddedVersion.id,
      policyVersion.id,
    );

    TestValidator.equals(
      "embedded policyVersion version_code should match",
      embeddedVersion.version_code,
      policyVersion.version_code,
    );

    TestValidator.equals(
      "embedded policyVersion status should match",
      embeddedVersion.status,
      policyVersion.status,
    );

    TestValidator.equals(
      "embedded policyVersion effective_from should match",
      embeddedVersion.effective_from ?? null,
      policyVersion.effective_from ?? null,
    );

    TestValidator.equals(
      "embedded policyVersion effective_until should match",
      embeddedVersion.effective_until ?? null,
      policyVersion.effective_until ?? null,
    );
  }

  // Embedded createdByAdmin consistency (when present)
  if (fetchedOverride.createdByAdmin !== undefined) {
    const createdByAdmin = fetchedOverride.createdByAdmin;

    TestValidator.equals(
      "createdByAdmin id should match adminAuthorized.id",
      createdByAdmin.id,
      adminAuthorized.id,
    );

    TestValidator.equals(
      "createdByAdmin email should match adminAuthorized.email",
      createdByAdmin.email,
      adminAuthorized.email,
    );
  }
}
