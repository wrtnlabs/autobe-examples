import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
 * Test case-insensitive partial name matching for role search.
 *
 * Validates the case-insensitive LIKE/ILIKE pattern matching behavior against role names within the authenticated member's organization context. The test authenticates as a new member, then performs multiple search queries using partial name terms to verify the search functionality correctly returns roles whose names contain the search term regardless of character case. Verifies that pagination metadata accurately reflects the filtered result set size. Confirms that omitting the search parameter or providing an empty string returns all available roles without applying name filtering. Ensures the response structure contains valid pagination information and role summaries including all required fields (id, name, builtIn, description, createdAt, updatedAt).
 *
 * 1. Authenticate as a new member to establish the active organization context.
 * 2. Retrieve all roles without search filtering to establish baseline data.
 * 3. Perform case-insensitive partial search for a common term (e.g., 'man' matching 'Manager').
 * 4. Validate that search results contain only roles with names matching the term.
 * 5. Verify pagination metadata correctly reflects the filtered results count.
 * 6. Test empty search string behavior to confirm it returns all roles.
 * 7. Confirm response structure integrity with required fields.
 */
export async function test_api_role_search_by_name_partial_match(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new member to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Retrieve all roles without search filtering to establish baseline
  const allRolesResponse = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: { page: 1, limit: 100 } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(allRolesResponse);
  TestValidator.equals(
    "baseline pagination records matches data length",
    allRolesResponse.pagination.records,
    allRolesResponse.data.length,
  );
  TestValidator.predicate(
    "baseline contains at least one role",
    allRolesResponse.data.length > 0,
  );
  // 3. Extract partial name from a role for search testing
  const targetRole = allRolesResponse.data[0];
  typia.assertGuard(targetRole);
  const searchTerm = targetRole.name.substring(
    0,
    Math.ceil(targetRole.name.length / 2),
  );
  // 4. Perform case-insensitive partial search
  const searchResponse = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search results all contain the search term case-insensitively",
    searchResponse.data.every((role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  TestValidator.equals(
    "search pagination records matches data length",
    searchResponse.pagination.records,
    searchResponse.data.length,
  );
  TestValidator.equals(
    "search current page is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "search limit matches request",
    searchResponse.pagination.limit,
    100,
  );
  // 5. Test empty search string returns all roles
  const emptySearchResponse =
    await api.functional.hrmPlatform.member.roles.index(memberConnection, {
      body: {
        search: "",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    });
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search returns same count as baseline",
    emptySearchResponse.pagination.records,
    allRolesResponse.pagination.records,
  );
}
