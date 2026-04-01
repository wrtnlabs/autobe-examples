import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

export async function test_api_project_member_search_by_employee_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as main member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: "Test Owner",
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Select organization as active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals(
    "organization selected",
    selectedOrg.id,
    organization.id,
  );
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Search Test Project",
        color_code: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Create 3 additional members with distinct names who will become employees
  const employee1Auth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        display_name: "Alice Johnson",
      },
    },
  );
  typia.assert(employee1Auth);
  const employee2Auth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        display_name: "Bob Smith",
      },
    },
  );
  typia.assert(employee2Auth);
  const employee3Auth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        display_name: "Charlie Brown",
      },
    },
  );
  typia.assert(employee3Auth);
  // 6. Assign employees to project
  // Note: Using member IDs as employee IDs - assumes system auto-creates employee records
  // when members join organizations, or member ID equals employee ID in this context
  const member1 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        body: {
          hrm_platform_employee_id: employee1Auth.id,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(member1);
  const member2 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        body: {
          hrm_platform_employee_id: employee2Auth.id,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(member2);
  const member3 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        body: {
          hrm_platform_employee_id: employee3Auth.id,
          role: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(member3);
  // 7. Test search scenarios
  // 7.1 Search with "Alice" - should return exactly 1 member
  const searchAlice =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "Alice",
        },
      },
    );
  typia.assert(searchAlice);
  TestValidator.equals("Alice search count", searchAlice.pagination.records, 1);
  TestValidator.equals("Alice search pages", searchAlice.pagination.pages, 1);
  TestValidator.predicate(
    "Alice found",
    searchAlice.data.some((m) =>
      m.employee.user.display_name.toLowerCase().includes("alice"),
    ),
  );
  // 7.2 Search with "li" (partial match) - should return 1 member (Alice Johnson)
  const searchPartial =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "li",
        },
      },
    );
  typia.assert(searchPartial);
  TestValidator.equals(
    "partial search count",
    searchPartial.pagination.records,
    1,
  );
  TestValidator.predicate(
    "partial match found",
    searchPartial.data.some((m) =>
      m.employee.user.display_name.toLowerCase().includes("li"),
    ),
  );
  // 7.3 Search with "Smith" - should return exactly 1 member (Bob Smith)
  const searchSmith =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "Smith",
        },
      },
    );
  typia.assert(searchSmith);
  TestValidator.equals("Smith search count", searchSmith.pagination.records, 1);
  TestValidator.predicate(
    "Smith found",
    searchSmith.data.some((m) =>
      m.employee.user.display_name.toLowerCase().includes("smith"),
    ),
  );
  // 7.4 Search with "NonExistent" - should return 0 members
  const searchNone =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "NonExistent",
        },
      },
    );
  typia.assert(searchNone);
  TestValidator.equals("no match count", searchNone.pagination.records, 0);
  TestValidator.equals("no match pages", searchNone.pagination.pages, 0);
  TestValidator.equals("no match data length", searchNone.data.length, 0);
  // 7.5 Search without filter - should return all 3 members
  const searchAll =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(searchAll);
  TestValidator.predicate(
    "all members returned",
    searchAll.pagination.records >= 3,
  );
  TestValidator.predicate(
    "has Alice",
    searchAll.data.some((m) =>
      m.employee.user.display_name.toLowerCase().includes("alice"),
    ),
  );
  TestValidator.predicate(
    "has Bob",
    searchAll.data.some((m) =>
      m.employee.user.display_name.toLowerCase().includes("bob"),
    ),
  );
  TestValidator.predicate(
    "has Charlie",
    searchAll.data.some((m) =>
      m.employee.user.display_name.toLowerCase().includes("charlie"),
    ),
  );
  // 8. Validate case-insensitive search
  const searchLowercase =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: "alice",
        },
      },
    );
  typia.assert(searchLowercase);
  TestValidator.equals(
    "case insensitive count",
    searchLowercase.pagination.records,
    1,
  );
  TestValidator.predicate(
    "case insensitive match",
    searchLowercase.data.some((m) =>
      m.employee.user.display_name.toLowerCase().includes("alice"),
    ),
  );
}
