import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test role list search by partial name match functionality.
 *
 * Validates the partial name matching search feature for the role list endpoint. After authenticating as a member, the test calls the roles list endpoint with various search parameters to verify case-insensitive partial matching behavior.
 *
 * The test covers three scenarios: searching with a partial match term that matches built-in roles (e.g., 'own' matches 'Owner'), searching with a term that matches multiple roles (e.g., 'er' matches 'Owner', 'Manager'), and searching with a term that matches no roles to verify empty results handling.
 *
 * 1. Member authenticates via join to access organization-scoped role list.
 * 2. Search with partial term 'own' to match 'Owner' role.
 * 3. Validate response contains only roles with names containing 'own' (case-insensitive).
 * 4. Verify pagination metadata reflects filtered result count.
 * 5. Search with term 'er' to match multiple roles ('Owner', 'Manager').
 * 6. Validate all matching roles are returned.
 * 7. Search with non-matching term 'xyz123' to verify empty results.
 * 8. Confirm data array is empty and records count is zero.
 */
export async function test_api_role_list_search_by_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Set authorization header from the auth result
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 2. Search with partial term 'own' to match 'Owner' role
  const searchOwn = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        search: "own",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(searchOwn);
  // 3. Validate response contains only roles with names containing 'own'
  TestValidator.predicate("all roles contain 'own' in name", () =>
    searchOwn.data.every((role) => role.name.toLowerCase().includes("own")),
  );
  // 4. Verify pagination metadata reflects filtered result count
  TestValidator.equals(
    "records count matches data length",
    searchOwn.pagination.records,
    searchOwn.data.length,
  );
  // 5. Search with term 'er' to match multiple roles ('Owner', 'Manager')
  const searchEr = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        search: "er",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(searchEr);
  // 6. Validate all matching roles are returned
  TestValidator.predicate("all roles contain 'er' in name", () =>
    searchEr.data.every((role) => role.name.toLowerCase().includes("er")),
  );
  TestValidator.predicate(
    "multiple roles matched",
    () => searchEr.data.length >= 2,
  );
  // 7. Search with non-matching term 'xyz123' to verify empty results
  const searchNoMatch = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        search: "xyz123",
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(searchNoMatch);
  // 8. Confirm data array is empty and records count is zero
  TestValidator.equals(
    "empty data array for no match",
    searchNoMatch.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for no match",
    searchNoMatch.pagination.records,
    0,
  );
}
