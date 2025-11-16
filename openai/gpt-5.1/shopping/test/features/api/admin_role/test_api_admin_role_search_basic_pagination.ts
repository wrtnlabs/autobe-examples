import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRole";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Basic pagination search for platform admin roles.
 *
 * Business goal
 *
 * - Verify that a platform administrator can retrieve a paginated list of admin
 *   roles with minimal search filters and that pagination metadata is
 *   consistent with stored roles.
 *
 * High level flow
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - This both creates the admin identity and sets Authorization header on the
 *         shared connection via the SDK, so subsequent calls are authenticated
 *         as this platform admin.
 * 2. Seed several distinct admin roles using POST
 *    /shoppingMall/platformAdmin/adminRoles.
 *
 *    - Use IShoppingMallAdminRole.ICreate for the request body.
 *    - Ensure unique `code` values and varied `name`/`description_text` so we can
 *         later check that at least a subset appears in listings.
 * 3. Call PATCH /shoppingMall/platformAdmin/adminRoles with an
 *    IShoppingMallAdminRole.IRequest body specifying only `page` and `limit`
 *    and leaving all other filters undefined.
 *
 *    - Use something like page=1, limit=10; the actual semantics of page vs
 *         pagination.current are backend defined, but we can still assert
 *         consistency between pagination metadata and returned data length.
 * 4. Validate the response type and pagination metadata.
 *
 *    - Assert the response using typia.assert to ensure it matches
 *         IPageIShoppingMallAdminRole.ISummary.
 *    - Check that `pagination.limit` is positive.
 *    - Check that `pagination.records` is at least the number of returned items and
 *         that `pagination.pages` is consistent with `records`.
 * 5. Validate that created roles are included in the listing.
 *
 *    - Because the DB may contain pre-existing data and the ordering is not
 *         specified, we do not assert that all created roles appear on the
 *         first page. Instead we check that _at least one_ of the roles we just
 *         created is present in the returned data by matching on `code` and
 *         `id`.
 *
 * Implementation notes
 *
 * - Use RandomGenerator and typia.random to create realistic join and role data
 *   within the DTO constraints.
 * - Rely on the SDK to manage Authorization headers after join; do not touch
 *   `connection.headers` directly in the test.
 * - Use TestValidator.predicate and TestValidator.equals with descriptive titles
 *   for all business-level checks, but do not duplicate the type checks already
 *   covered by typia.assert.
 */
export async function test_api_admin_role_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (authentication bootstrap)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Seed several distinct admin roles
  const seedCount = 5;
  const createdRoles: IShoppingMallAdminRole[] = [];

  for (let i = 0; i < seedCount; i += 1) {
    const roleBody = {
      code: `TEST_ROLE_${RandomGenerator.alphaNumeric(8)}_${i}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description_text: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies IShoppingMallAdminRole.ICreate;

    const role: IShoppingMallAdminRole =
      await api.functional.shoppingMall.platformAdmin.adminRoles.create(
        connection,
        {
          body: roleBody,
        },
      );
    typia.assert<IShoppingMallAdminRole>(role);
    createdRoles.push(role);
  }

  // 3. Call PATCH /shoppingMall/platformAdmin/adminRoles with minimal filters
  const pageRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallAdminRole.IRequest;

  const pageResult: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      {
        body: pageRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be >= number of returned items",
    pagination.records >= data.length,
  );

  TestValidator.predicate(
    "pagination pages should be >= 0",
    pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when records is 0, pages should be 0",
      pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, pages should be at least 1",
      pagination.pages >= 1,
    );
  }

  // 5. Validate that at least one created role is present in the first page
  const createdRoleIds = createdRoles.map((role) => role.id);
  const createdRoleCodes = createdRoles.map((role) => role.code);

  const hasCreatedRole = data.some(
    (summary) =>
      createdRoleIds.includes(summary.id) ||
      createdRoleCodes.includes(summary.code),
  );

  TestValidator.predicate(
    "role listing should contain at least one of the newly created roles",
    hasCreatedRole,
  );
}
