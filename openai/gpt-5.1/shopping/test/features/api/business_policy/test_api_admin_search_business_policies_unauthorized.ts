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

export async function test_api_admin_search_business_policies_unauthorized(
  connection: api.IConnection,
) {
  // 1. Admin join & token issuance
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create at least one business policy under authenticated admin
  const createBody = typia.random<IShoppingMallBusinessPolicy.ICreate>();
  const createdPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(createdPolicy);

  // 3. Sanity check: authorized search returns at least one policy
  const authorizedPage =
    await api.functional.shoppingMall.admin.businessPolicies.index(connection, {
      body: {
        policy_code: null,
        name: null,
        category: null,
        is_active: null,
        search: null,
        page: 1 as number & tags.Type<"int32">,
        limit: 10 as number & tags.Type<"int32">,
        sort_by: null,
        sort_direction: null,
      } satisfies IShoppingMallBusinessPolicy.IRequest,
    });
  typia.assert<IPageIShoppingMallBusinessPolicy.ISummary>(authorizedPage);
  TestValidator.predicate(
    "authorized search should see at least one business policy",
    () => authorizedPage.pagination.records >= 1,
  );

  // 4. Build an unauthenticated connection (no headers)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Call search endpoint without any Authorization header
  await TestValidator.error(
    "unauthorized business policy search without token is rejected",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.index(
        unauthConn,
        {
          body: {
            policy_code: null,
            name: null,
            category: null,
            is_active: null,
            search: null,
            page: 1 as number & tags.Type<"int32">,
            limit: 10 as number & tags.Type<"int32">,
            sort_by: null,
            sort_direction: null,
          } satisfies IShoppingMallBusinessPolicy.IRequest,
        },
      );
    },
  );

  // 6. Build a connection with an explicitly invalid token
  const invalidConn: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: "Bearer invalid-token",
    },
  };

  // 7. Call search endpoint with invalid Authorization token
  await TestValidator.error(
    "unauthorized business policy search with invalid token is rejected",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.index(
        invalidConn,
        {
          body: {
            policy_code: null,
            name: null,
            category: null,
            is_active: null,
            search: null,
            page: 1 as number & tags.Type<"int32">,
            limit: 10 as number & tags.Type<"int32">,
            sort_by: null,
            sort_direction: null,
          } satisfies IShoppingMallBusinessPolicy.IRequest,
        },
      );
    },
  );
}
