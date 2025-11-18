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
 * Validate admin actor search filtering by actor type and status.
 *
 * Business goal:
 *
 * - Ensure that an authenticated admin can use the unified actor search endpoint
 *   to filter results by a single actor type (customer) and a concrete
 *   high-level status (active).
 * - Confirm that pagination metadata is consistent in both non-empty and empty
 *   result cases.
 *
 * Flow:
 *
 * 1. Register an admin account using POST /auth/admin/join. This establishes an
 *    authenticated admin session via the SDK which injects the access token
 *    into the connection headers.
 * 2. Call PATCH /shoppingMall/admin/actors/search with an
 *    IShoppingMallActorSearch.IRequest body configured as:
 *
 *    - Page = 1
 *    - Limit = a small positive int (e.g., 10)
 *    - Actor_types = ["customer"]
 *    - Status = "active"
 *    - Query, emails, phone_numbers, registered_from, registered_to, sort_by,
 *         sort_direction all explicitly set to null
 * 3. Assert that the response conforms to IPageIShoppingMallActorSearch.ISummary
 *    with typia.assert and inspect its pagination object.
 * 4. If pagination.records > 0, iterate over each entry in data and validate:
 *
 *    - Actor.actorType === "customer"
 *    - Actor.status === "active" Also, ensure pagination.current equals the
 *         requested page and pagination.limit equals the requested limit.
 * 5. If pagination.records === 0, verify that pagination.pages === 0, and that
 *    data.length is 0, to ensure consistent behavior for empty result sets.
 */
export async function test_api_admin_actor_search_by_actor_type_and_status(
  connection: api.IConnection,
) {
  // 1. Register an admin (dependency: POST /auth/admin/join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Prepare search request body targeting customers with active status
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchBody = {
    query: null,
    actor_types: ["customer"],
    emails: null,
    phone_numbers: null,
    status: "active",
    registered_from: null,
    registered_to: null,
    page,
    limit,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallActorSearch.IRequest;

  const pageResult: IPageIShoppingMallActorSearch.ISummary =
    await api.functional.shoppingMall.admin.actors.search.index(connection, {
      body: searchBody,
    });
  typia.assert<IPageIShoppingMallActorSearch.ISummary>(pageResult);

  // Basic pagination consistency checks
  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current page equals requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    pagination.limit,
    limit,
  );

  if (pagination.records === 0) {
    // 5. Empty result behavior
    TestValidator.equals("empty result has zero pages", pagination.pages, 0);
    TestValidator.equals(
      "empty result has zero data length",
      pageResult.data.length,
      0,
    );
    return;
  }

  // 4. Non-empty results: validate filters are respected
  TestValidator.predicate(
    "non-empty result should have at least one data row",
    pageResult.data.length > 0,
  );

  for (const actor of pageResult.data) {
    TestValidator.equals(
      "actorType matches requested customer filter",
      actor.actorType,
      "customer",
    );
    TestValidator.equals(
      "status matches requested active filter",
      actor.status,
      "active",
    );
  }
}
