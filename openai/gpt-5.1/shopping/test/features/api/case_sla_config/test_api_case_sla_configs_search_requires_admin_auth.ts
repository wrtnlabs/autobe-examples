import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCaseSlaConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

export async function test_api_case_sla_configs_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Join as admin and obtain authorized admin context
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
  typia.assert(adminAuthorized);

  // 2. Create a business policy as admin
  const policyCreateBody = {
    policy_code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 3. Create a policy version under that policy
  const policyVersionCreateBody = {
    version_code: "v1",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const version: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: policyVersionCreateBody,
      },
    );
  typia.assert(version);

  // 4. Seed at least one SLA configuration bound to that policy version
  const slaCreateBody = {
    shopping_mall_business_policy_version_id: version.id,
    case_type: "refund",
    actor_role: "seller",
    action_type: "initial_response",
    target_duration_seconds: 3600,
    warning_duration_seconds: 1800,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateBody,
    });
  typia.assert(slaConfig);

  // 5. Prepare a deterministic search request body
  const searchRequestBody = {
    page: 1,
    limit: 10,
    case_type: slaConfig.case_type,
    actor_role: slaConfig.actor_role,
    action_type: slaConfig.action_type,
    is_active: slaConfig.is_active,
  } satisfies IShoppingMallCaseSlaConfig.IRequest;

  // Helper to make an unauthenticated connection clone
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Unauthenticated request: expect error (authorization required)
  await TestValidator.error(
    "unauthenticated SLA search should fail",
    async () => {
      await api.functional.shoppingMall.admin.caseSlaConfigs.index(
        unauthConnection,
        {
          body: searchRequestBody,
        },
      );
    },
  );

  // 7. Authorized admin search with the original connection (has admin token from join)
  const pageResult: IPageIShoppingMallCaseSlaConfig.ISummary =
    await api.functional.shoppingMall.admin.caseSlaConfigs.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(pageResult);

  // 8. Validate that at least one SLA config is returned and includes the seeded config
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "admin SLA search should return at least one record",
    pageResult.data.length > 0,
  );

  const found = pageResult.data.some((summary) => summary.id === slaConfig.id);
  TestValidator.predicate(
    "seeded SLA config should be included in admin search results",
    found,
  );
}
