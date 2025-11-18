import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_business_policy_version_erase_rejected_for_active_version(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a business policy that will own the active version
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;

  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    category: "refund",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(createdPolicy);

  // 3. Create an active policy version under this policy
  const versionCode = `v_${RandomGenerator.alphaNumeric(6)}`;

  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const versionCreateBody = {
    version_code: versionCode,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body_markdown: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 10,
    }),
    parameters_json: null,
    status: "active",
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const createdVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: createdPolicy.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(createdVersion);

  // Sanity check: codes should match what we sent
  TestValidator.equals(
    "created policy code should match request code",
    createdPolicy.policy_code,
    policyCode,
  );
  TestValidator.equals(
    "created version code should match request code",
    createdVersion.version_code,
    versionCode,
  );

  // 4. Attempt to erase the active version and assert that it fails
  await TestValidator.error(
    "erasing an active policy version must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.erase(
        connection,
        {
          policyCode: createdPolicy.policy_code,
          versionCode: createdVersion.version_code,
        },
      );
    },
  );
}
