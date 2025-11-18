import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Soft delete a business policy version via the admin update endpoint.
 *
 * Business goals:
 *
 * - Verify that an authenticated admin can logically delete (soft delete) a
 *   specific business policy version by setting its `deleted_at` field using
 *   the update endpoint.
 * - Ensure that the version remains fully auditable (id, version_code, parent
 *   policy information and original content are preserved).
 * - Confirm that only the intended lifecycle fields (deleted_at and optional
 *   status) change while all other fields stay intact.
 *
 * End-to-end steps:
 *
 * 1. Register an admin using POST /auth/admin/join.
 * 2. As that admin, create a business policy using POST
 *    /shoppingMall/admin/businessPolicies.
 * 3. Create a concrete policy version under that policy using POST
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions.
 * 4. Call PUT
 *    /shoppingMall/admin/businessPolicies/{policyCode}/versions/{versionCode}
 *    with a body that sets a specific `deleted_at` timestamp (and optionally
 *    moves status to a retired/terminal value).
 * 5. Validate that the returned IShoppingMallPolicyVersion:
 *
 *    - Has `deleted_at` equal to the requested timestamp.
 *    - Preserves id, version_code, and parent policy code.
 *    - Leaves untouched fields (title, body_markdown, parameters_json,
 *         effective_from, effective_until) unchanged.
 */
export async function test_api_business_policy_version_soft_delete_via_update(
  connection: api.IConnection,
) {
  // 1. Register an admin (join) to obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy under this admin context
  const policyCreateBody = {
    policy_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(createdPolicy);

  // 3. Create a policy version for that business policy
  const versionCreateBody = {
    version_code: RandomGenerator.alphaNumeric(6),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    parameters_json: JSON.stringify({
      maxRefundDays: 30,
      allowPartialRefund: true,
    }),
    status: "active",
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const originalVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: createdPolicy.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert(originalVersion);

  // 4. Soft delete this version via update by setting deleted_at
  const deletedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    deleted_at: deletedAt,
    // move to a terminal lifecycle state alongside soft deletion
    status: "retired",
  } satisfies IShoppingMallPolicyVersion.IUpdate;

  const updatedVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.update(
      connection,
      {
        policyCode: createdPolicy.policy_code,
        versionCode: originalVersion.version_code,
        body: updateBody,
      },
    );
  typia.assert(updatedVersion);

  // 5. Validate business expectations on the updated resource

  // 5.1 deleted_at is set and matches the requested timestamp
  TestValidator.equals(
    "policy version deleted_at is updated to requested timestamp",
    updatedVersion.deleted_at,
    deletedAt,
  );

  // 5.2 ID remains unchanged
  TestValidator.equals(
    "policy version id remains unchanged after soft delete",
    updatedVersion.id,
    originalVersion.id,
  );

  // 5.3 version_code remains unchanged
  TestValidator.equals(
    "policy version_code remains unchanged after soft delete",
    updatedVersion.version_code,
    originalVersion.version_code,
  );

  // 5.4 parent policy context remains the same
  TestValidator.equals(
    "parent policy code in version summary matches created policy",
    updatedVersion.policy.code,
    createdPolicy.policy_code,
  );

  // 5.5 core content fields remain untouched (title, body_markdown,
  //     parameters_json, effective_from, effective_until) except for
  //     status/deleted_at we changed
  TestValidator.equals(
    "title remains unchanged after soft delete",
    updatedVersion.title,
    originalVersion.title,
  );
  TestValidator.equals(
    "body_markdown remains unchanged after soft delete",
    updatedVersion.body_markdown,
    originalVersion.body_markdown,
  );
  TestValidator.equals(
    "parameters_json remains unchanged after soft delete",
    updatedVersion.parameters_json,
    originalVersion.parameters_json,
  );
  TestValidator.equals(
    "effective_from remains unchanged after soft delete",
    updatedVersion.effective_from,
    originalVersion.effective_from,
  );
  TestValidator.equals(
    "effective_until remains unchanged after soft delete",
    updatedVersion.effective_until,
    originalVersion.effective_until,
  );

  // 5.6 status is updated to retired as requested
  TestValidator.equals(
    "status is updated to retired when soft deleting policy version",
    updatedVersion.status,
    updateBody.status,
  );
}
