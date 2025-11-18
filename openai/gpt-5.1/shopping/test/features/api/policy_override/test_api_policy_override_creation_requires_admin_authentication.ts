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

export async function test_api_policy_override_creation_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Join as admin to get authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Create a base business policy as this admin
  const policyCreateBody = typia.random<IShoppingMallBusinessPolicy.ICreate>();
  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(policy);

  // 3. Create a concrete policy version for this policy
  const versionCreateBody: IShoppingMallPolicyVersion.ICreate = {
    version_code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert(version);

  // 4. Build a valid policy override payload referencing the created version
  const overrideCreateBody: IShoppingMallPolicyOverride.ICreate = {
    shopping_mall_policy_version_id: version.id,
    subject_type: "seller",
    subject_id: typia.random<string & tags.Format<"uuid">>(),
    subject_display: RandomGenerator.name(2),
    override_code: "special_refund_window",
    override_value: "P30D", // ISO-8601 duration for 30 days
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyOverride.ICreate;

  // 5. Prepare an unauthenticated connection by clearing headers
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Attempt to create override without authentication and expect error
  await TestValidator.error(
    "unauthenticated policy override creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.policyOverrides.create(
        unauthConn,
        {
          body: overrideCreateBody,
        },
      );
    },
  );

  // 7. Authenticated admin call should succeed
  const createdOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: overrideCreateBody,
    });
  typia.assert(createdOverride);

  // 8. Business-level assertions on created override
  TestValidator.equals(
    "override must reference the requested policy version",
    createdOverride.shopping_mall_policy_version_id,
    overrideCreateBody.shopping_mall_policy_version_id,
  );

  TestValidator.equals(
    "override subject_type must be preserved",
    createdOverride.subject_type,
    overrideCreateBody.subject_type,
  );

  TestValidator.equals(
    "override_code must be preserved",
    createdOverride.override_code,
    overrideCreateBody.override_code,
  );

  TestValidator.equals(
    "override_value must be preserved",
    createdOverride.override_value,
    overrideCreateBody.override_value,
  );

  TestValidator.equals(
    "created_by_admin_id must match authenticated admin",
    createdOverride.created_by_admin_id,
    adminId,
  );
}
