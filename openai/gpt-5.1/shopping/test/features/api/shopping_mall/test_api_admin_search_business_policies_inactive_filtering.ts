import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBusinessPolicy";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Verify that admin business policy search honors is_active filter and rejects
 * unauthenticated access.
 *
 * Business context: Admins manage logical business policies like refund rules
 * or review governance. The PATCH /shoppingMall/admin/businessPolicies search
 * endpoint must be able to filter policies by their activation flag so that
 * admin UIs can easily separate active policies from inactive/retired ones.
 * Also, because policies are sensitive governance artifacts, searching them
 * must require an authenticated admin context.
 *
 * Steps:
 *
 * 1. Join as an admin via POST /auth/admin/join.
 * 2. Create one active and one inactive business policy via POST
 *    /shoppingMall/admin/businessPolicies.
 * 3. Search with is_active = true and verify that:
 *
 *    - Response type is valid and pagination is sane.
 *    - Every returned policy has is_active === true.
 *    - The explicitly created active policy appears in the result set.
 * 4. Search with is_active = false and verify that:
 *
 *    - Every returned policy has is_active === false.
 *    - The explicitly created inactive policy appears in the result set.
 * 5. Attempt the same search using an unauthenticated connection and assert that
 *    an error is thrown.
 */
export async function test_api_admin_search_business_policies_inactive_filtering(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication)
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create one active and one inactive business policy
  const basePolicyCode = RandomGenerator.alphaNumeric(12);

  const activePolicyCreate = {
    policy_code: `${basePolicyCode}-active`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const inactivePolicyCreate = {
    policy_code: `${basePolicyCode}-inactive`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: false,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const activePolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: activePolicyCreate },
    );
  typia.assert(activePolicy);

  const inactivePolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: inactivePolicyCreate },
    );
  typia.assert(inactivePolicy);

  // 3. Search with is_active = true
  const activeSearchRequest = {
    policy_code: null,
    name: null,
    category: null,
    is_active: true,
    search: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallBusinessPolicy.IRequest;

  const activeSearchPage: IPageIShoppingMallBusinessPolicy.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.index(connection, {
      body: activeSearchRequest,
    });
  typia.assert(activeSearchPage);
  typia.assert<IPage.IPagination>(activeSearchPage.pagination);

  // Assert all results are active
  for (const policy of activeSearchPage.data) {
    TestValidator.predicate(
      "all policies in is_active=true search must be active",
      policy.is_active === true,
    );
  }

  // Assert the created active policy is present
  TestValidator.predicate(
    "created active policy must appear in is_active=true search results",
    activeSearchPage.data.some((p) => p.id === activePolicy.id),
  );

  // 4. Search with is_active = false
  const inactiveSearchRequest = {
    policy_code: null,
    name: null,
    category: null,
    is_active: false,
    search: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallBusinessPolicy.IRequest;

  const inactiveSearchPage: IPageIShoppingMallBusinessPolicy.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.index(connection, {
      body: inactiveSearchRequest,
    });
  typia.assert(inactiveSearchPage);
  typia.assert<IPage.IPagination>(inactiveSearchPage.pagination);

  for (const policy of inactiveSearchPage.data) {
    TestValidator.predicate(
      "all policies in is_active=false search must be inactive",
      policy.is_active === false,
    );
  }

  TestValidator.predicate(
    "created inactive policy must appear in is_active=false search results",
    inactiveSearchPage.data.some((p) => p.id === inactivePolicy.id),
  );

  // 5. Negative: unauthenticated connection cannot search
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated admin businessPolicies.index should fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.index(
        unauthenticatedConnection,
        { body: activeSearchRequest },
      );
    },
  );
}
