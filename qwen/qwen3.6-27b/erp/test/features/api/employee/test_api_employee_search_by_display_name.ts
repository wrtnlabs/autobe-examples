import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Verify full-text search capability for employee display names with case-insensitive partial matching.
 *
 * Tests the employee search endpoint to ensure that the text search filter correctly matches employee display names through the member relationship. Validates that search results include partial matches, exclude non-matching employees, and are case-insensitive.
 *
 * The search operates on the member's display_name via a JOIN relationship between the employee and member tables. Results are returned as paginated summaries containing employee details and associated member profile information.
 *
 * 1. Authenticate as an organization owner by registering a member with display name "Alice Smith".
 * 2. Register a second member with display name "Bob Jones" for use as a control employee.
 * 3. Create both members as employees within the owner's organization by invoking the employee generation utility with explicit member IDs.
 * 4. Search for "alice" and verify that Alice's employee record appears in results while Bob's does not.
 * 5. Search for "ALICE" to confirm case-insensitive partial matching behavior.
 * 6. Search for "xyz" to verify empty results when no employees match the query.
 */
export async function test_api_employee_search_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner (Alice)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: { display_name: "Alice Smith" },
  });
  typia.assert(ownerAuth);
  // 2. Register second member (Bob)
  const bobConnection: api.IConnection = { host: connection.host };
  const bobAuth = await authorize_member_join(bobConnection, {
    body: { display_name: "Bob Jones" },
  });
  typia.assert(bobAuth);
  // 3. Create employees in owner's organization
  const aliceEmployee =
    await generate_random_hrm_platform_member_employees_create(
      ownerConnection,
      { body: { memberId: ownerAuth.id } },
    );
  typia.assert(aliceEmployee);
  const bobEmployee =
    await generate_random_hrm_platform_member_employees_create(
      ownerConnection,
      { body: { memberId: bobAuth.id } },
    );
  typia.assert(bobEmployee);
  // 4. Search for "alice" - should return Alice employee, NOT Bob
  const searchResult = await api.functional.hrmPlatform.member.employees.index(
    ownerConnection,
    {
      body: { search: "alice" } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(searchResult);
  const hasAlice = ArrayUtil.has(
    searchResult.data,
    (emp) => emp.member.display_name === "Alice Smith",
  );
  const hasBob = ArrayUtil.has(
    searchResult.data,
    (emp) => emp.member.display_name === "Bob Jones",
  );
  TestValidator.predicate(
    "search for 'alice' returns Alice employee",
    hasAlice,
  );
  TestValidator.predicate(
    "search for 'alice' excludes Bob employee",
    hasBob === false,
  );
  // 5. Case-insensitive search for "ALICE"
  const caseInsensitiveResult =
    await api.functional.hrmPlatform.member.employees.index(ownerConnection, {
      body: { search: "ALICE" } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(caseInsensitiveResult);
  const hasAliceUpper = ArrayUtil.has(
    caseInsensitiveResult.data,
    (emp) => emp.member.display_name === "Alice Smith",
  );
  TestValidator.predicate(
    "search 'ALICE' matches Alice (case-insensitive)",
    hasAliceUpper,
  );
  // 6. Non-matching search query should return no results
  const noMatchResult = await api.functional.hrmPlatform.member.employees.index(
    ownerConnection,
    {
      body: { search: "xyz" } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "non-matching search returns empty results",
    noMatchResult.data,
    [],
  );
}
