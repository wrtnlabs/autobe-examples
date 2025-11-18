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

export async function test_api_policy_override_delete_pending_override_cleanup(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorized admin context and token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a business policy that will own policy versions and overrides
  const policyBody = {
    policy_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "fees",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(businessPolicy);

  // 3. Create a concrete policy version under this policy
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const versionBody = {
    version_code: "v1",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({ baseFeePercent: 2.5 }),
    status: "draft",
    effective_from: now.toISOString(),
    effective_until: future.toISOString(),
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: businessPolicy.policy_code,
        body: versionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  // 4. Create a pending policy override linked to the new version
  const overrideBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "global",
    subject_id: null,
    subject_display: "Global fee override for testing",
    override_code: "commission_rate",
    override_value: "3.5",
    reason:
      "Draft override created for cleanup test; should remain pending until deletion.",
    status: "pending",
    effective_from: now.toISOString(),
    effective_until: future.toISOString(),
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const override: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(override);

  // Sanity-check that the created override is pending and attached to the right version
  TestValidator.equals(
    "created override should be pending",
    override.status,
    "pending",
  );
  TestValidator.equals(
    "override should reference created policy version",
    override.shopping_mall_policy_version_id,
    policyVersion.id,
  );

  // 5. Delete the pending override
  await api.functional.shoppingMall.admin.policyOverrides.erase(connection, {
    policyOverrideId: override.id,
  });

  // 6. Second deletion attempt should fail with some error (not-found semantics)
  await TestValidator.error(
    "second delete should fail for already-deleted override",
    async () => {
      await api.functional.shoppingMall.admin.policyOverrides.erase(
        connection,
        {
          policyOverrideId: override.id,
        },
      );
    },
  );
}
