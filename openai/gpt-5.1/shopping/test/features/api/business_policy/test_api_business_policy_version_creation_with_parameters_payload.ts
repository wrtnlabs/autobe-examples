import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_business_policy_version_creation_with_parameters_payload(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authorization context.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new business policy under the admin context.
  const policyCode: string = `risk_${RandomGenerator.alphabets(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "risk",
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
  typia.assert(policy);

  TestValidator.equals(
    "created policy_code should match request payload",
    policy.policy_code,
    policyCreateBody.policy_code,
  );
  TestValidator.equals(
    "created policy category should be risk",
    policy.category,
    policyCreateBody.category,
  );

  // 3. Create a new policy version with parameters_json and markdown body.
  const versionCode: string = `v1-${RandomGenerator.alphabets(4)}`;
  const bodyMarkdown: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const parametersObject = {
    maxRefundAmount: 100000,
    requiresSupervisorApproval: true,
  } as const;
  const parametersJson: string = JSON.stringify(parametersObject);

  const effectiveFrom: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const versionCreateBody = {
    version_code: versionCode,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body_markdown: bodyMarkdown,
    parameters_json: parametersJson,
    status: "active",
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: versionCreateBody,
      },
    );
  typia.assert(version);

  // 4. Validate linkage between version and its parent policy.
  TestValidator.equals(
    "version.policy.id should match created policy id",
    version.policy.id,
    policy.id,
  );
  TestValidator.equals(
    "version.policy.code should match policy_code",
    version.policy.code,
    policyCreateBody.policy_code,
  );

  // 5. Validate coexistence and integrity of body_markdown and parameters_json.
  TestValidator.equals(
    "version body_markdown should equal request body_markdown",
    version.body_markdown,
    bodyMarkdown,
  );
  TestValidator.equals(
    "version status should equal request status",
    version.status,
    versionCreateBody.status,
  );

  // parameters_json should be non-null and parse to the same object.
  TestValidator.predicate(
    "parameters_json should be non-null",
    version.parameters_json !== null && version.parameters_json !== undefined,
  );

  if (
    version.parameters_json !== null &&
    version.parameters_json !== undefined
  ) {
    const parsedActual = JSON.parse(version.parameters_json) as {
      maxRefundAmount: number;
      requiresSupervisorApproval: boolean;
    };
    const parsedExpected = parametersObject;

    TestValidator.equals(
      "parsed parameters_json.maxRefundAmount should match",
      parsedActual.maxRefundAmount,
      parsedExpected.maxRefundAmount,
    );
    TestValidator.equals(
      "parsed parameters_json.requiresSupervisorApproval should match",
      parsedActual.requiresSupervisorApproval,
      parsedExpected.requiresSupervisorApproval,
    );
  }

  // 6. Validate effective period fields.
  TestValidator.equals(
    "effective_from should equal request effective_from",
    version.effective_from,
    effectiveFrom,
  );
  TestValidator.equals(
    "effective_until should be null",
    version.effective_until,
    null,
  );
}
