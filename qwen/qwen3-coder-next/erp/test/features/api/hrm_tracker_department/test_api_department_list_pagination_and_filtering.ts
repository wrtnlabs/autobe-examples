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

export async function test_api_department_list_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with random data
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create organization with member actor
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        },
      },
    );
  typia.assert(organization);
  // 3. Create multiple departments with parent-child relationships
  // Create root departments (parent_id: null)
  const rootDepartments = await Promise.all([
    generate_random_hrm_tracker_member_departments_create(memberConnection, {
      body: {
        name: "Management",
        description: "Executive management department",
        parent_id: null,
      },
    }),
    generate_random_hrm_tracker_member_departments_create(memberConnection, {
      body: {
        name: "Engineering",
        description: "Engineering and development department",
        parent_id: null,
      },
    }),
    generate_random_hrm_tracker_member_departments_create(memberConnection, {
      body: {
        name: "Sales",
        description: "Sales and marketing department",
        parent_id: null,
      },
    }),
  ]);
  typia.assert(rootDepartments);
  // Create child departments
  const childDepartments = await Promise.all([
    generate_random_hrm_tracker_member_departments_create(memberConnection, {
      body: {
        name: "Backend Team",
        description: "Backend development team",
        parent_id: rootDepartments[1].id,
      },
    }),
    generate_random_hrm_tracker_member_departments_create(memberConnection, {
      body: {
        name: "Frontend Team",
        description: "Frontend development team",
        parent_id: rootDepartments[1].id,
      },
    }),
    generate_random_hrm_tracker_member_departments_create(memberConnection, {
      body: {
        name: "Design Team",
        description: "Design and UX team",
        parent_id: rootDepartments[1].id,
      },
    }),
  ]);
  typia.assert(childDepartments);
  // 4. Test pagination parameters (page, limit)
  // Test with page=1, limit=2
  const page1Limit2 = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(page1Limit2);
  TestValidator.equals("pagination page 1", page1Limit2.pagination.current, 1);
  TestValidator.equals("pagination limit 2", page1Limit2.pagination.limit, 2);
  TestValidator.predicate(
    "pagination records should be more than 2",
    page1Limit2.pagination.records > 2,
  );
  TestValidator.equals(
    "pagination pages calculation",
    page1Limit2.pagination.pages,
    Math.ceil(page1Limit2.pagination.records / 2),
  );
  TestValidator.equals("data count matches limit", page1Limit2.data.length, 2);
  // Test with page=2, limit=2
  const page2Limit2 = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 2,
      },
    },
  );
  typia.assert(page2Limit2);
  TestValidator.equals("pagination page 2", page2Limit2.pagination.current, 2);
  TestValidator.equals("pagination limit 2", page2Limit2.pagination.limit, 2);
  // 5. Test filtering by name partial match
  const filterByEngineering = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        name: "Engineering",
      },
    },
  );
  typia.assert(filterByEngineering);
  TestValidator.predicate(
    "filter by engineering contains results",
    filterByEngineering.data.length > 0,
  );
  filterByEngineering.data.forEach((dept: IHrmTrackerDepartment.ISummary) => {
    TestValidator.predicate(
      "name contains Engineering",
      dept.name.includes("Engineering"),
    );
  });
  // Test exact name match
  const filterByManagement = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        name: "Management",
      },
    },
  );
  typia.assert(filterByManagement);
  TestValidator.predicate(
    "filter by management exact match",
    filterByManagement.data.length === 1,
  );
  TestValidator.equals(
    "filter by management name",
    filterByManagement.data[0].name,
    "Management",
  );
  // 6. Test filtering by parent_id (root departments)
  const rootFilter = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        parent_id: undefined,
      },
    },
  );
  typia.assert(rootFilter);
  TestValidator.predicate(
    "root departments have null parent",
    rootFilter.data.every(
      (dept: IHrmTrackerDepartment.ISummary) => dept.parent === null,
    ),
  );
  TestValidator.equals("root departments count", rootFilter.data.length, 3);
  // Test filtering by parent_id (child departments)
  const childFilter = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        parent_id: rootDepartments[1].id,
      },
    },
  );
  typia.assert(childFilter);
  TestValidator.equals("child departments count", childFilter.data.length, 3);
  childFilter.data.forEach((dept: IHrmTrackerDepartment.ISummary) => {
    TestValidator.equals(
      "child department parent id matches",
      dept.parent?.id,
      rootDepartments[1].id,
    );
  });
  // 7. Test empty results
  const noResults = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        name: "NonExistentDepartmentThatShouldNotExist",
      },
    },
  );
  typia.assert(noResults);
  TestValidator.equals(
    "no results pagination",
    noResults.pagination.records,
    0,
  );
  TestValidator.equals("no results data array", noResults.data.length, 0);
  // 8. Test hierarchy information (validates all properties via typia.assert)
  const hierarchyCheck = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(hierarchyCheck);
  TestValidator.predicate(
    "hierarchy check has results",
    hierarchyCheck.data.length > 0,
  );
  // 9. Test boundary values
  // Test with limit=1 (minimum)
  const limit1 = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        limit: 1,
      },
    },
  );
  typia.assert(limit1);
  TestValidator.equals("limit 1", limit1.pagination.limit, 1);
  // Test with limit=100 (maximum allowed)
  const limit100 = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        limit: 100,
      },
    },
  );
  typia.assert(limit100);
  TestValidator.equals("limit 100", limit100.pagination.limit, 100);
}
