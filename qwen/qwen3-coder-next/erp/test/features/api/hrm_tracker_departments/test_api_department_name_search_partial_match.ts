import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_departments_create } from "../../../generate/generate_random_hrm_tracker_member_departments_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_department } from "../../../prepare/prepare_random_hrm_tracker_department";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

/**
 * Test department name filtering with partial matching.
 * Verifies that searching by partial department name returns only departments
 * whose names match the search term within the current organization context.
 * Tests the LIKE partial match filtering functionality and ensures organization
 * isolation prevents cross-organization data leakage.
 */
export async function test_api_department_name_search_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 2. Create departments with distinct naming patterns within the same organization
  const dept1 = await generate_random_hrm_tracker_member_departments_create(
    memberConnection,
    {
      body: {
        name: "Engineering Team",
        description: "Development department",
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    },
  );
  typia.assert(dept1);
  const dept2 = await generate_random_hrm_tracker_member_departments_create(
    memberConnection,
    {
      body: {
        name: "Engineering Support",
        description: "Support department",
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    },
  );
  typia.assert(dept2);
  const dept3 = await generate_random_hrm_tracker_member_departments_create(
    memberConnection,
    {
      body: {
        name: "Marketing Team",
        description: "Marketing department",
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    },
  );
  typia.assert(dept3);
  // 3. Test partial name search for "Engineering"
  const engineeringSearch = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        name: "Engineering",
      } satisfies IHrmTrackerDepartment.IRequest,
    },
  );
  typia.assert(engineeringSearch);
  // 4. Validate search results for "Engineering"
  TestValidator.equals(
    "Engineering search returns 2 results",
    engineeringSearch.data.length,
    2,
  );
  const engineeringNames = engineeringSearch.data.map(
    (d: IHrmTrackerDepartment.ISummary) => d.name,
  );
  TestValidator.predicate(
    "Engineering Team in results",
    engineeringNames.includes("Engineering Team"),
  );
  TestValidator.predicate(
    "Engineering Support in results",
    engineeringNames.includes("Engineering Support"),
  );
  // 5. Test partial name search for "Team"
  const teamSearch = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        name: "Team",
      } satisfies IHrmTrackerDepartment.IRequest,
    },
  );
  typia.assert(teamSearch);
  // 6. Validate search results for "Team"
  TestValidator.equals(
    "Team search returns 2 results",
    teamSearch.data.length,
    2,
  );
  const teamNames = teamSearch.data.map(
    (d: IHrmTrackerDepartment.ISummary) => d.name,
  );
  TestValidator.predicate(
    "Engineering Team in results",
    teamNames.includes("Engineering Team"),
  );
  TestValidator.predicate(
    "Marketing Team in results",
    teamNames.includes("Marketing Team"),
  );
  // 7. Test partial name search for non-existent department
  const nonExistentSearch = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        name: "Finance",
      } satisfies IHrmTrackerDepartment.IRequest,
    },
  );
  typia.assert(nonExistentSearch);
  TestValidator.equals(
    "Finance search returns 0 results",
    nonExistentSearch.data.length,
    0,
  );
  // 8. Validate pagination metadata
  TestValidator.equals(
    "Pagination current is 1",
    engineeringSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "Pagination limit matches result count",
    engineeringSearch.pagination.limit,
    engineeringSearch.data.length,
  );
  TestValidator.equals(
    "Pagination records matches result count",
    engineeringSearch.pagination.records,
    engineeringSearch.data.length,
  );
}
