import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_business_policy_version_erase_rejected_when_referenced(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorized context.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Abcd1234!", // matches password format; exact rules enforced server-side
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a new business policy.
  const policyCode = `policy_${RandomGenerator.alphaNumeric(10)}`;
  const policyBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "risk", // any business category string is allowed
    description: RandomGenerator.paragraph({ sentences: 8 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  // 3. Create an ACTIVE policy version under the created policy.
  const versionCode = `v_${RandomGenerator.alphaNumeric(8)}`;
  const now = new Date();
  const versionBody = {
    version_code: versionCode,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    parameters_json: null,
    status: "active",
    effective_from: now.toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: versionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(version);

  // Sanity check: codes used in path and response are aligned.
  TestValidator.equals(
    "created version code must match request",
    version.version_code,
    versionCode,
  );

  // 4. Attempt to erase the active policy version.
  // We expect this to fail according to business constraints for referenced/active versions.
  await TestValidator.error(
    "deleting active policy version must fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.erase(
        connection,
        {
          policyCode,
          versionCode,
        },
      );
    },
  );
}
