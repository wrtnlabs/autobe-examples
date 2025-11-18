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

export async function test_api_policy_override_detail_access_control_for_admin_only(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context (Authorization header is managed by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a base business policy
  const policyCode: string = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: "Standard Refund Policy",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  // 3. Create a concrete policy version under this policy
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const versionCreateBody = {
    version_code: "v1",
    title: "Standard Refund Policy v1",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: JSON.stringify({
      refundWindowDays: 14,
      restockingFeePercent: 10,
    }),
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: versionCreateBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  // 4. Create a policy override referencing this version
  const overrideCreateBody = {
    shopping_mall_policy_version_id: policyVersion.id,
    subject_type: "seller",
    subject_id: typia.random<string & tags.Format<"uuid">>(),
    subject_display: RandomGenerator.name(),
    override_code: "refund_window_days",
    override_value: "30",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  const createdOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody,
    });
  typia.assert<IShoppingMallPolicyOverride>(createdOverride);

  const overrideId = createdOverride.id;

  // 5. Control: authenticated admin can read the override detail
  const adminRead1: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.at(connection, {
      policyOverrideId: overrideId,
    });
  typia.assert<IShoppingMallPolicyOverride>(adminRead1);

  // Core identity & linkage checks
  TestValidator.equals(
    "override id should match between create and first admin read",
    adminRead1.id,
    createdOverride.id,
  );
  TestValidator.equals(
    "linked policy version id should remain consistent",
    adminRead1.shopping_mall_policy_version_id,
    createdOverride.shopping_mall_policy_version_id,
  );
  TestValidator.equals(
    "subject_type should remain consistent",
    adminRead1.subject_type,
    createdOverride.subject_type,
  );
  TestValidator.equals(
    "override_code should remain consistent",
    adminRead1.override_code,
    createdOverride.override_code,
  );
  TestValidator.equals(
    "override_value should remain consistent",
    adminRead1.override_value,
    createdOverride.override_value,
  );
  TestValidator.equals(
    "status should remain consistent",
    adminRead1.status,
    createdOverride.status,
  );

  // 6. Unauthenticated access attempt: clone connection with empty headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated connection should not be able to read policy override detail",
    async () => {
      await api.functional.shoppingMall.admin.policyOverrides.at(
        unauthConnection,
        {
          policyOverrideId: overrideId,
        },
      );
    },
  );

  // 7. Optional: simulate another "fresh" unauthenticated connection
  const anotherUnauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "second unauthenticated connection should also be blocked from reading override detail",
    async () => {
      await api.functional.shoppingMall.admin.policyOverrides.at(
        anotherUnauthConnection,
        {
          policyOverrideId: overrideId,
        },
      );
    },
  );

  // 8. Ensure admin can still read and that core fields are unchanged after failed attempts
  const adminRead2: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.at(connection, {
      policyOverrideId: overrideId,
    });
  typia.assert<IShoppingMallPolicyOverride>(adminRead2);

  TestValidator.equals(
    "override id should remain stable after unauthorized attempts",
    adminRead2.id,
    createdOverride.id,
  );
  TestValidator.equals(
    "policy version linkage should remain stable after unauthorized attempts",
    adminRead2.shopping_mall_policy_version_id,
    createdOverride.shopping_mall_policy_version_id,
  );
  TestValidator.equals(
    "override_code should remain stable after unauthorized attempts",
    adminRead2.override_code,
    createdOverride.override_code,
  );
  TestValidator.equals(
    "override_value should remain stable after unauthorized attempts",
    adminRead2.override_value,
    createdOverride.override_value,
  );
  TestValidator.equals(
    "status should remain stable after unauthorized attempts",
    adminRead2.status,
    createdOverride.status,
  );
}
