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
 * Validate admin role search filtering by exact code and partial name.
 *
 * Business goals:
 *
 * - Ensure platform admins can search role definitions using a combination of
 *   exact code and a substring of the role name.
 * - Confirm that when both filters are supplied, the result set is narrowed to
 *   the single matching role.
 * - Confirm that when only a partial name is provided, multiple roles sharing
 *   that substring can be returned.
 *
 * Scenario steps:
 *
 * 1. Join as a platform administrator to establish an authenticated context.
 * 2. Create three admin roles:
 *
 *    - Target role whose code and name will be used in the combined filter.
 *    - Sibling role that shares a name substring with the target role but has a
 *         different code.
 *    - Control role that does not contain the substring.
 * 3. Call PATCH /shoppingMall/platformAdmin/adminRoles with both code and partial
 *    name, expecting exactly one matching summary.
 * 4. Validate pagination metadata and that the returned role matches the target
 *    role’s identity fields.
 * 5. Call the same endpoint with only the partial name filter, expecting at least
 *    two matches (target + sibling) and verifying their presence by id.
 */
export async function test_api_admin_role_search_with_code_and_name_filters(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to get an authorized session
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(platformAdmin);

  // 2. Prepare a shared name substring and create three roles
  const sharedSubstring = "SupportAgent";

  // Target role: will be uniquely identifiable by code, shares name substring
  const targetCreateBody = {
    code: `ROLE_${RandomGenerator.alphaNumeric(8)}`,
    name: `${sharedSubstring} L1`,
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const targetRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: targetCreateBody },
    );
  typia.assert(targetRole);

  // Sibling role: shares the same name substring but has a different code
  const siblingCreateBody = {
    code: `ROLE_${RandomGenerator.alphaNumeric(8)}`,
    name: `${sharedSubstring} L2`,
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const siblingRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: siblingCreateBody },
    );
  typia.assert(siblingRole);

  // Control role: does not include the shared substring in its name
  const controlCreateBody = {
    code: `ROLE_${RandomGenerator.alphaNumeric(8)}`,
    name: `Control ${RandomGenerator.name(1)}`,
    description_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const controlRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: controlCreateBody },
    );
  typia.assert(controlRole);

  // 3. Search with combined exact code and partial name filters
  const combinedFilterRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    code: targetRole.code,
    name: sharedSubstring,
  } satisfies IShoppingMallAdminRole.IRequest;

  const combinedResult: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      { body: combinedFilterRequest },
    );
  typia.assert(combinedResult);

  // 4. Validate that exactly one role is returned and it is the target role
  TestValidator.equals(
    "combined filter should return exactly one record",
    combinedResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter should return exactly one data item",
    combinedResult.data.length,
    1,
  );

  const combinedItem = combinedResult.data[0];
  typia.assert<IShoppingMallAdminRole.ISummary>(combinedItem);

  TestValidator.equals(
    "combined filter result id matches target role id",
    combinedItem.id,
    targetRole.id,
  );
  TestValidator.equals(
    "combined filter result code matches target role code",
    combinedItem.code,
    targetRole.code,
  );
  TestValidator.equals(
    "combined filter result name matches target role name",
    combinedItem.name,
    targetRole.name,
  );

  if (
    targetRole.description_text !== undefined &&
    targetRole.description_text !== null
  ) {
    TestValidator.equals(
      "combined filter description mirrors target description when present",
      combinedItem.description ?? null,
      targetRole.description_text,
    );
  }

  // 5. Search with only the partial name filter (no code) to get multiple roles
  const nameOnlyRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    name: sharedSubstring,
  } satisfies IShoppingMallAdminRole.IRequest;

  const nameOnlyResult: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      { body: nameOnlyRequest },
    );
  typia.assert(nameOnlyResult);

  TestValidator.predicate(
    "name-only filter should return at least two records (target + sibling)",
    nameOnlyResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "name-only filter should include at least two data items",
    nameOnlyResult.data.length >= 2,
  );

  const idsFromNameOnly = nameOnlyResult.data.map((r) => r.id);

  TestValidator.predicate(
    "name-only results should include target role",
    idsFromNameOnly.includes(targetRole.id),
  );
  TestValidator.predicate(
    "name-only results should include sibling role",
    idsFromNameOnly.includes(siblingRole.id),
  );

  TestValidator.predicate(
    "all roles with matching substring in name-only results are expected roles",
    nameOnlyResult.data.every((r) =>
      r.name.includes(sharedSubstring)
        ? r.id === targetRole.id || r.id === siblingRole.id
        : true,
    ),
  );
}
