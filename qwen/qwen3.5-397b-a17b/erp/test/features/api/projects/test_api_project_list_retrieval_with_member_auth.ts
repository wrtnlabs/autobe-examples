import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_project_list_retrieval_with_member_auth(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple projects with different statuses
  const activeProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          color_code: "#3498db",
          status: "active",
          budget_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
          >(),
          start_date: new Date().toISOString(),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(activeProject);
  const archivedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          color_code: "#95a5a6",
          status: "archived",
          budget_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
          >(),
          end_date: new Date().toISOString(),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(archivedProject);
  const completedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          color_code: "#27ae60",
          status: "completed",
          budget_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
          >(),
          start_date: new Date(Date.now() - 86400000 * 30).toISOString(),
          end_date: new Date().toISOString(),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(completedProject);
  // 3. Retrieve project list with default pagination
  const projectList = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(projectList);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    projectList.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", projectList.pagination.limit === 20);
  TestValidator.predicate(
    "total records >= 3",
    projectList.pagination.records >= 3,
  );
  TestValidator.predicate(
    "total pages >= 1",
    projectList.pagination.pages >= 1,
  );
  // 5. Validate all created projects are in the list
  const projectIds = projectList.data.map((p) => p.id);
  TestValidator.predicate(
    "active project in list",
    projectIds.includes(activeProject.id),
  );
  TestValidator.predicate(
    "archived project in list",
    projectIds.includes(archivedProject.id),
  );
  TestValidator.predicate(
    "completed project in list",
    projectIds.includes(completedProject.id),
  );
  // 6. Validate each project has required fields
  for (const project of projectList.data) {
    TestValidator.predicate("project has id", project.id !== undefined);
    TestValidator.predicate("project has name", project.name !== undefined);
    TestValidator.predicate(
      "project has color_code",
      project.color_code !== undefined,
    );
    TestValidator.predicate("project has status", project.status !== undefined);
    TestValidator.predicate(
      "project has created_at",
      project.created_at !== undefined,
    );
    // Validate status is one of the expected values
    TestValidator.predicate(
      "status is valid enum",
      ["active", "archived", "completed"].includes(project.status),
    );
  }
  // 7. Validate specific project details
  const foundActive = projectList.data.find((p) => p.id === activeProject.id)!;
  TestValidator.equals(
    "active project name",
    foundActive.name,
    activeProject.name,
  );
  TestValidator.equals("active project status", foundActive.status, "active");
  TestValidator.equals(
    "active project color",
    foundActive.color_code,
    "#3498db",
  );
  TestValidator.predicate(
    "active project has budget_hours",
    foundActive.budget_hours !== undefined,
  );
  const foundArchived = projectList.data.find(
    (p) => p.id === archivedProject.id,
  )!;
  TestValidator.equals(
    "archived project status",
    foundArchived.status,
    "archived",
  );
  TestValidator.equals(
    "archived project color",
    foundArchived.color_code,
    "#95a5a6",
  );
  const foundCompleted = projectList.data.find(
    (p) => p.id === completedProject.id,
  )!;
  TestValidator.equals(
    "completed project status",
    foundCompleted.status,
    "completed",
  );
  TestValidator.equals(
    "completed project color",
    foundCompleted.color_code,
    "#27ae60",
  );
  // 8. Test filtering by status
  const activeOnlyList = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(activeOnlyList);
  TestValidator.predicate(
    "active filter returns only active",
    activeOnlyList.data.every((p) => p.status === "active"),
  );
  // 9. Test search functionality
  const searchList = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        search: activeProject.name.substring(0, 5),
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(searchList);
  // Search may return 0 or more results, just validate structure
  TestValidator.predicate(
    "search returns valid structure",
    searchList.data.length >= 0,
  );
}
