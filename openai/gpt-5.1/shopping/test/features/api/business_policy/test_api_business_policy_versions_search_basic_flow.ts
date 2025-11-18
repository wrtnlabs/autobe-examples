import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicyVersion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_business_policy_versions_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminPassw0rd!",
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new business policy
  const uniquePolicyCode = `refund_${RandomGenerator.alphaNumeric(12)}`;

  const businessPolicyBody = {
    policy_code: uniquePolicyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: businessPolicyBody,
      },
    );
  typia.assert(createdPolicy);

  TestValidator.equals(
    "created policy_code should match request",
    createdPolicy.policy_code,
    businessPolicyBody.policy_code,
  );

  // 3. Create a concrete policy version under the created policy
  const nowIso = new Date().toISOString();

  const parametersObject = {
    max_refund_days: 30,
    allow_partial: true,
  } as const;

  const versionCreateBody = {
    version_code: "v1",
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    parameters_json: JSON.stringify(parametersObject),
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
  typia.assert(createdVersion);

  TestValidator.equals(
    "created version_code should match request",
    createdVersion.version_code,
    versionCreateBody.version_code,
  );

  // 4. List/search versions for the created policy with basic pagination
  const indexRequestBody = {
    page: 1,
    limit: 20,
    status: null,
    effective_from_gte: null,
    effective_from_lte: null,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallPolicyVersion.IRequest;

  const pageResult: IPageIShoppingMallPolicyVersion.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.versions.index(
      connection,
      {
        policyCode: createdPolicy.policy_code,
        body: indexRequestBody,
      },
    );
  typia.assert(pageResult);

  // 5. Assertions and validations
  const pagination = pageResult.pagination;
  const summaries = pageResult.data;

  TestValidator.equals(
    "pagination.current should reflect requested page",
    pagination.current,
    indexRequestBody.page,
  );
  TestValidator.equals(
    "pagination.limit should reflect requested limit",
    pagination.limit,
    indexRequestBody.limit,
  );

  TestValidator.predicate(
    "version listing should contain at least one record",
    summaries.length >= 1,
  );

  const matchedSummary = summaries.find(
    (summary) => summary.id === createdVersion.id,
  );

  TestValidator.predicate(
    "listing should include the created version by id",
    matchedSummary !== undefined,
  );

  if (matchedSummary) {
    TestValidator.equals(
      "matched summary version_code should match created version",
      matchedSummary.version_code,
      createdVersion.version_code,
    );
    TestValidator.equals(
      "matched summary title should match created version",
      matchedSummary.title,
      createdVersion.title,
    );
    TestValidator.equals(
      "matched summary status should match created version",
      matchedSummary.status,
      createdVersion.status,
    );

    TestValidator.predicate(
      "matched summary created_at should be a non-empty string",
      typeof matchedSummary.created_at === "string" &&
        matchedSummary.created_at.length > 0,
    );
    TestValidator.predicate(
      "matched summary updated_at should be a non-empty string",
      typeof matchedSummary.updated_at === "string" &&
        matchedSummary.updated_at.length > 0,
    );

    if (matchedSummary.policy) {
      TestValidator.equals(
        "summary.policy.code should match created policy policy_code",
        matchedSummary.policy.code,
        createdPolicy.policy_code,
      );
      TestValidator.equals(
        "summary.policy.id should match created policy id",
        matchedSummary.policy.id,
        createdPolicy.id,
      );
    }
  }
}
