import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSearch";
import type { IShoppingMallActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSearch";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Ensure that cross-actor admin search endpoint enforces admin-only access.
 *
 * Business rationale:
 *
 * - /shoppingMall/admin/actors/search exposes sensitive directory-style
 *   information across customers, sellers, admins, and guest users.
 * - It must not be callable by unauthenticated clients, and only admins are
 *   allowed to use it.
 *
 * This test covers two key behaviors:
 *
 * 1. Unauthenticated connection cannot call the endpoint (401/403).
 * 2. Properly authenticated admin can call the endpoint successfully.
 */
export async function test_api_admin_actor_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Unauthenticated access must fail
  // Create an unauthenticated connection by clearing headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthenticatedRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    query: null,
    actor_types: null,
    emails: null,
    phone_numbers: null,
    status: null,
    registered_from: null,
    registered_to: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallActorSearch.IRequest;

  await TestValidator.httpError(
    "unauthenticated actor search must be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.actors.search.index(
        unauthenticatedConnection,
        {
          body: unauthenticatedRequestBody,
        },
      );
    },
  );

  // 2. Admin-authenticated access must succeed
  // Register a new admin via /auth/admin/join using valid DTO data.
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
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // Now connection contains Authorization header for admin.
  const adminSearchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    query: null,
    actor_types: null,
    emails: null,
    phone_numbers: null,
    status: null,
    registered_from: null,
    registered_to: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallActorSearch.IRequest;

  const searchResult: IPageIShoppingMallActorSearch.ISummary =
    await api.functional.shoppingMall.admin.actors.search.index(connection, {
      body: adminSearchRequestBody,
    });

  typia.assert<IPageIShoppingMallActorSearch.ISummary>(searchResult);

  TestValidator.equals(
    "admin search pagination current page should match request",
    searchResult.pagination.current,
    adminSearchRequestBody.page,
  );

  TestValidator.equals(
    "admin search pagination limit should match request",
    searchResult.pagination.limit,
    adminSearchRequestBody.limit,
  );
}
