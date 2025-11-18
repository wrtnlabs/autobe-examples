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
 * Validate creation of a seller-scoped policy override linked to a concrete
 * policy version.
 *
 * Business context:
 *
 * - Platform admins can define high-level business policies, version them over
 *   time, and create targeted policy overrides for specific subjects like
 *   sellers.
 * - This test ensures that an admin can:
 *
 *   1. Join as an authenticated admin actor.
 *   2. Create a business policy and a concrete active version.
 *   3. Create a policy override that targets a specific seller subject and links to
 *        that policy version.
 * - It also verifies that the override response correctly embeds admin and policy
 *   summaries and preserves key fields from the request.
 *
 * Step-by-step flow:
 *
 * 1. Register an admin via POST /auth/admin/join and rely on SDK to attach the
 *    Authorization token to the connection.
 * 2. Create a business policy with is_active=true using POST
 *    /shoppingMall/admin/businessPolicies.
 * 3. Create an active policy version under that policy using POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions with an
 *    effective_from timestamp of "now" and an effective_until timestamp in the
 *    future.
 * 4. Create a policy override via POST /shoppingMall/admin/policyOverrides with:
 *
 *    - Shopping_mall_policy_version_id = id from step 3.
 *    - Subject_type = "seller" and a concrete seller UUID and display name.
 *    - Override_code and override_value representing an adjusted commission rate.
 *    - Status = "active" and the same effective_from/effective_until window.
 * 5. Assert that the created override:
 *
 *    - Has a non-null id and its shopping_mall_policy_version_id matches the version
 *         id from step 3.
 *    - Embeds policyVersion summary with matching id, version_code, and parent
 *         policy summary referencing the correct business policy.
 *    - Has subject_type "seller", subject_id equal to the provided seller id, and
 *         subject_display equal to the provided display name.
 *    - Preserves override_code and override_value from the request.
 *    - Records created_by_admin_id equal to the joined admin's id and embeds a
 *         createdByAdmin summary consistent with that admin.
 *    - Reflects the requested status and effective_from/effective_until values.
 *    - Has deleted_at === null, indicating the override is not soft-deleted.
 */
export async function test_api_policy_override_creation_for_specific_seller(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminId = adminAuthorized.id;
  const adminEmail = adminAuthorized.email;

  // 2. Create a business policy (e.g., seller performance domain)
  const policyCode = `seller_performance_${RandomGenerator.alphaNumeric(8)}`;

  const policyCreateBody = {
    policy_code: policyCode,
    name: `Seller Performance Policy ${RandomGenerator.name(1)}`,
    category: "seller",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  TestValidator.equals(
    "created policy_code matches request",
    policy.policy_code,
    policyCreateBody.policy_code,
  );
  TestValidator.predicate(
    "created policy is active",
    policy.is_active === true,
  );

  // 3. Create an active policy version for that policy
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const versionCode = `v_${RandomGenerator.alphaNumeric(6)}`;

  const versionCreateBody = {
    version_code: versionCode,
    title: `Initial version for ${policyCode}`,
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ commission_rate_default: "0.15" }),
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policyCode,
        body: versionCreateBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(version);

  TestValidator.equals(
    "created policy version_code matches request",
    version.version_code,
    versionCreateBody.version_code,
  );
  TestValidator.equals(
    "created policy version status matches request",
    version.status,
    versionCreateBody.status,
  );
  TestValidator.equals(
    "created policy version effective_from matches request",
    version.effective_from,
    versionCreateBody.effective_from,
  );
  TestValidator.equals(
    "created policy version effective_until matches request",
    version.effective_until,
    versionCreateBody.effective_until,
  );

  // 4. Create a policy override targeting a specific seller
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerDisplay = `Seller ${RandomGenerator.name(1)}`;

  const overrideCode = "commission_rate";
  const overrideValue = "0.20"; // 20% commission as string

  const overrideEffectiveFrom = effectiveFrom;
  const overrideEffectiveUntil = effectiveUntil;

  const overrideCreateBody = {
    shopping_mall_policy_version_id: version.id,
    subject_type: "seller",
    subject_id: sellerId,
    subject_display: sellerDisplay,
    override_code: overrideCode,
    override_value: overrideValue,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    effective_from: overrideEffectiveFrom,
    effective_until: overrideEffectiveUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const override =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(override);

  // 5. Assertions on override fields and linkages

  // Linkage to policy version
  TestValidator.equals(
    "override shopping_mall_policy_version_id matches version.id",
    override.shopping_mall_policy_version_id,
    version.id,
  );

  // Embedded policyVersion summary
  TestValidator.predicate(
    "override.policyVersion summary is present",
    override.policyVersion !== undefined,
  );

  if (override.policyVersion !== undefined) {
    const summary = override.policyVersion;

    TestValidator.equals(
      "policyVersion summary id matches version.id",
      summary.id,
      version.id,
    );
    TestValidator.equals(
      "policyVersion summary version_code matches",
      summary.version_code,
      version.version_code,
    );
    TestValidator.equals(
      "policyVersion summary status matches",
      summary.status,
      version.status,
    );
    TestValidator.equals(
      "policyVersion summary effective_from matches",
      summary.effective_from,
      version.effective_from,
    );
    TestValidator.equals(
      "policyVersion summary effective_until matches",
      summary.effective_until,
      version.effective_until,
    );

    // policy summary linkage (if present)
    if (summary.policy !== undefined) {
      const policySummary = summary.policy;
      TestValidator.equals(
        "policy summary id matches business policy id",
        policySummary.id,
        policy.id,
      );
      TestValidator.equals(
        "policy summary code matches business policy policy_code",
        policySummary.code,
        policy.policy_code,
      );
      TestValidator.equals(
        "policy summary name matches business policy name",
        policySummary.name,
        policy.name,
      );
      TestValidator.equals(
        "policy summary category matches business policy category",
        policySummary.category,
        policy.category,
      );
    }
  }

  // Subject checks
  TestValidator.equals(
    "override subject_type is 'seller'",
    override.subject_type,
    overrideCreateBody.subject_type,
  );
  TestValidator.equals(
    "override subject_id matches provided seller id",
    override.subject_id,
    sellerId,
  );
  TestValidator.equals(
    "override subject_display matches provided display name",
    override.subject_display,
    sellerDisplay,
  );

  // Override code/value checks
  TestValidator.equals(
    "override_code matches request",
    override.override_code,
    overrideCode,
  );
  TestValidator.equals(
    "override_value matches request",
    override.override_value,
    overrideValue,
  );

  // Admin linkage
  TestValidator.equals(
    "created_by_admin_id matches joined admin id",
    override.created_by_admin_id,
    adminId,
  );

  TestValidator.predicate(
    "createdByAdmin summary is present",
    override.createdByAdmin !== undefined,
  );

  if (override.createdByAdmin !== undefined) {
    const createdByAdmin = override.createdByAdmin;
    TestValidator.equals(
      "createdByAdmin.id matches admin id",
      createdByAdmin.id,
      adminId,
    );
    TestValidator.equals(
      "createdByAdmin.email matches admin email",
      createdByAdmin.email,
      adminEmail,
    );
  }

  // Status and effective window checks
  TestValidator.equals(
    "override status matches request",
    override.status,
    overrideCreateBody.status,
  );
  TestValidator.equals(
    "override effective_from matches request",
    override.effective_from,
    overrideEffectiveFrom,
  );
  TestValidator.equals(
    "override effective_until matches request",
    override.effective_until,
    overrideEffectiveUntil,
  );

  // deleted_at should be null for active override
  TestValidator.equals(
    "override deleted_at is null for active override",
    override.deleted_at ?? null,
    null,
  );
}
