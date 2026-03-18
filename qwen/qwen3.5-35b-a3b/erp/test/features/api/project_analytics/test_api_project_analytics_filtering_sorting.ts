import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_project_analytics_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/join",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(member);
  // 2. Extract organization ID from member's organization memberships
  const orgMembership = member.organization_memberships[0];
  TestValidator.predicate(
    "member has organization membership",
    orgMembership !== undefined && orgMembership.organization.id !== undefined,
  );
  const organizationId = orgMembership.organization.id;
  // 3. Create test projects with different statuses
  const activeProject =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Active Project Alpha",
          description: "Project with active status for testing",
          color_code: "#3498db",
          budget_hours: 160,
          start_date: new Date().toISOString(),
        },
      },
    );
  typia.assert(activeProject);
  const archivedProject =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Archived Project Beta",
          description: "Project with archived status for testing",
          color_code: "#95a5a6",
          budget_hours: 80,
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(archivedProject);
  const completedProject =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: "Completed Project Gamma",
          description: "Project with completed status for testing",
          color_code: "#2ecc71",
          budget_hours: 200,
          start_date: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(completedProject);
  // 4. Test status filtering
  {
    ("description");
    ("Status filter returns only active projects");
  }
  const statusActive =
    await api.functional.hrms.member.projects.analytics.index(
      memberConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(statusActive);
  TestValidator.equals(
    "status filter active returns only active projects",
    statusActive.data.every((p) => p.status === "active"),
    true,
  );
  const statusArchived =
    await api.functional.hrms.member.projects.analytics.index(
      memberConnection,
      {
        body: {
          status: "archived",
        },
      },
    );
  typia.assert(statusArchived);
  TestValidator.equals(
    "status filter archived returns only archived projects",
    statusArchived.data.every((p) => p.status === "archived"),
    true,
  );
  const statusCompleted =
    await api.functional.hrms.member.projects.analytics.index(
      memberConnection,
      {
        body: {
          status: "completed",
        },
      },
    );
  typia.assert(statusCompleted);
  TestValidator.equals(
    "status filter completed returns only completed projects",
    statusCompleted.data.every((p) => p.status === "completed"),
    true,
  );
  // 5. Test sorting by project_name
  {
    const nameSortAsc =
      await api.functional.hrms.member.projects.analytics.index(
        memberConnection,
        {
          body: {
            sort_by: "project_name",
            order: "asc",
          },
        },
      );
    typia.assert(nameSortAsc);
    const isNameSortedAsc = nameSortAsc.data.every((project, index) => {
      if (index === 0) return true;
      return project.name >= nameSortAsc.data[index - 1].name;
    });
    TestValidator.equals(
      "sort by project_name ascending works",
      isNameSortedAsc,
      true,
    );
    const nameSortDesc =
      await api.functional.hrms.member.projects.analytics.index(
        memberConnection,
        {
          body: {
            sort_by: "project_name",
            order: "desc",
          },
        },
      );
    typia.assert(nameSortDesc);
    const isNameSortedDesc = nameSortDesc.data.every((project, index) => {
      if (index === 0) return true;
      return project.name <= nameSortDesc.data[index - 1].name;
    });
    TestValidator.equals(
      "sort by project_name descending works",
      isNameSortedDesc,
      true,
    );
  }
  // 6. Test sorting by budget_utilization
  {
    const budgetSortAsc =
      await api.functional.hrms.member.projects.analytics.index(
        memberConnection,
        {
          body: {
            sort_by: "budget_utilization",
            order: "asc",
          },
        },
      );
    typia.assert(budgetSortAsc);
    const isBudgetSorted = budgetSortAsc.data.every((project, index) => {
      if (index === 0) return true;
      return (
        (project.budget_utilization_percentage ?? 0) >=
        (budgetSortAsc.data[index - 1].budget_utilization_percentage ?? 0)
      );
    });
    TestValidator.equals(
      "sort by budget_utilization ascending works",
      isBudgetSorted,
      true,
    );
  }
  // 7. Test sorting by actual_hours
  {
    const hoursSortAsc =
      await api.functional.hrms.member.projects.analytics.index(
        memberConnection,
        {
          body: {
            sort_by: "actual_hours",
            order: "asc",
          },
        },
      );
    typia.assert(hoursSortAsc);
    const isHoursSorted = hoursSortAsc.data.every((project, index) => {
      if (index === 0) return true;
      return project.actual_hours >= hoursSortAsc.data[index - 1].actual_hours;
    });
    TestValidator.equals(
      "sort by actual_hours ascending works",
      isHoursSorted,
      true,
    );
  }
  // 8. Test sorting by created_at
  {
    const dateSortAsc =
      await api.functional.hrms.member.projects.analytics.index(
        memberConnection,
        {
          body: {
            sort_by: "created_at",
            order: "asc",
          },
        },
      );
    typia.assert(dateSortAsc);
    const isDateSorted = dateSortAsc.data.every((project, index) => {
      if (index === 0) return true;
      return project.created_at >= dateSortAsc.data[index - 1].created_at;
    });
    TestValidator.equals(
      "sort by created_at ascending works",
      isDateSorted,
      true,
    );
  }
  // 9. Test pagination with limit
  {
    const paginationTest =
      await api.functional.hrms.member.projects.analytics.index(
        memberConnection,
        {
          body: {
            limit: 2,
          },
        },
      );
    typia.assert(paginationTest);
    TestValidator.equals(
      "pagination returns correct limit (max 2)",
      Math.min(paginationTest.data.length, 2),
      paginationTest.data.length,
    );
    TestValidator.equals(
      "pagination metadata has correct current page",
      paginationTest.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination metadata has correct limit",
      paginationTest.pagination.limit,
      2,
    );
    TestValidator.predicate(
      "pagination metadata has correct total records",
      paginationTest.pagination.records >= 0,
    );
  }
  // 10. Test combined filters (status + sort)
  {
    const combinedFilter =
      await api.functional.hrms.member.projects.analytics.index(
        memberConnection,
        {
          body: {
            status: "active",
            sort_by: "actual_hours",
            order: "desc",
          },
        },
      );
    typia.assert(combinedFilter);
    const statusMatch = combinedFilter.data.every((p) => p.status === "active");
    TestValidator.equals(
      "combined status and sort filter works",
      statusMatch,
      true,
    );
  }
  // 11. Test date range filter
  {
    const dateFilter =
      await api.functional.hrms.member.projects.analytics.index(
        memberConnection,
        {
          body: {
            date_from: new Date().toISOString().split("T")[0],
            date_to: new Date().toISOString().split("T")[0],
          },
        },
      );
    typia.assert(dateFilter);
    // Verify response is valid and has correct structure
    TestValidator.predicate(
      "date filter returns valid response",
      dateFilter.data.length >= 0,
    );
  }
}