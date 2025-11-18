import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_business_policy_version_creation_with_effective_window(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a parent business policy (e.g., refund policy)
  const policyCodeSuffix = RandomGenerator.alphaNumeric(8);
  const policyCode = `refund_policy_${policyCodeSuffix}`;

  const createPolicyBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createPolicyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(createdPolicy);

  // Validate that the stored policy_code matches what we requested
  TestValidator.equals(
    "created policy_code should match request payload",
    createdPolicy.policy_code,
    createPolicyBody.policy_code,
  );

  TestValidator.equals(
    "created policy category should match request payload",
    createdPolicy.category,
    createPolicyBody.category,
  );

  TestValidator.predicate(
    "created business policy should be active",
    createdPolicy.is_active === true,
  );

  // 3. Compute future effective_from and effective_until window
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-based

  const nextMonth = (month + 1) % 12;
  const nextMonthYear = month === 11 ? year + 1 : year;
  const effectiveFromDate = new Date(
    Date.UTC(nextMonthYear, nextMonth, 1, 0, 0, 0, 0),
  );

  // Approximate quarter end: add ~3 months and go one day back
  const quarterEndMonth = (nextMonth + 3) % 12;
  const quarterEndYear =
    nextMonth + 3 >= 12 ? nextMonthYear + 1 : nextMonthYear;
  const effectiveUntilDate = new Date(
    Date.UTC(quarterEndYear, quarterEndMonth, 1, 0, 0, 0, 0),
  );
  // subtract 1 millisecond to get last moment of previous day
  effectiveUntilDate.setUTCMilliseconds(
    effectiveUntilDate.getUTCMilliseconds() - 1,
  );

  const effectiveFrom = effectiveFromDate.toISOString();
  const effectiveUntil = effectiveUntilDate.toISOString();

  // 4. Create a policy version under the created policy with the future window
  const versionCode = `${effectiveFromDate.getUTCFullYear()}-Q${
    Math.floor(effectiveFromDate.getUTCMonth() / 3) + 1
  }`;

  const parametersPayload = {
    refundWindowDays: 30,
    appliesFrom: effectiveFrom,
    appliesUntil: effectiveUntil,
  };
  const parametersJson = JSON.stringify(parametersPayload);

  const createVersionBody = {
    version_code: versionCode,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body_markdown: RandomGenerator.content({ paragraphs: 3 }),
    parameters_json: parametersJson,
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const createdVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: createdPolicy.policy_code,
        body: createVersionBody,
      },
    );
  typia.assert<IShoppingMallPolicyVersion>(createdVersion);

  // 5. Validate created version fields
  TestValidator.equals(
    "policy version_code should match request payload",
    createdVersion.version_code,
    createVersionBody.version_code,
  );

  TestValidator.equals(
    "policy version status should remain active",
    createdVersion.status,
    createVersionBody.status,
  );

  TestValidator.equals(
    "policy version effective_from should match request payload",
    createdVersion.effective_from ?? null,
    createVersionBody.effective_from ?? null,
  );

  TestValidator.equals(
    "policy version effective_until should match request payload",
    createdVersion.effective_until ?? null,
    createVersionBody.effective_until ?? null,
  );

  TestValidator.equals(
    "policy version parameters_json should be persisted as sent",
    createdVersion.parameters_json ?? null,
    createVersionBody.parameters_json ?? null,
  );

  // Validate linkage to parent policy summary
  TestValidator.equals(
    "policy summary code on version should match created policy_code",
    createdVersion.policy.code,
    createdPolicy.policy_code,
  );

  TestValidator.equals(
    "policy summary category on version should match created policy category",
    createdVersion.policy.category,
    createdPolicy.category,
  );

  TestValidator.predicate(
    "policy summary should indicate active policy",
    createdVersion.policy.is_active === true,
  );
}
