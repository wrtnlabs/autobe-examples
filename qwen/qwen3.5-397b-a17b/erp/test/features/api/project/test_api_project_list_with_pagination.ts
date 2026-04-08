import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test project list retrieval with pagination support.
 *
 * Validates the complete project listing workflow including member authentication, organization setup, multiple project creation, and paginated list retrieval. Ensures that the project list endpoint correctly returns all created projects with proper pagination metadata and sorting.
 *
 * Special attention is given to verifying that projects are sorted by created_at in descending order, pagination metadata accurately reflects the total count, and each project summary contains all required fields including organization reference.
 *
 * 1. Member registers with email and credentials.
 * 2. Member creates an organization as project container.
 * 3. Creates 5 projects with different names, colors, and statuses.
 * 4. Requests project list with default pagination (page=1, limit=20).
 * 5. Validates response contains all 5 projects sorted by created_at descending.
 * 6. Verifies pagination metadata (current=1, limit=20, records=5, pages=1).
 * 7. Validates each project summary includes required fields (id, name, color, status, budget_hours, organization, timestamps).
 */
export async function test_api_project_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create multiple projects with different attributes
  const projectCount = 5;
  const createdProjects: IHrmPlatformProject[] = [];
  for (let i = 0; i < projectCount; i++) {
    const project = await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Project ${i + 1} - ${RandomGenerator.name()}`,
          color: `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          budgetHours: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<100> &
              tags.Maximum<10000>
          >(),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
    typia.assert(project);
    createdProjects.push(project);
  }
  // 4. Request project list with default pagination
  const projectList = await api.functional.hrmPlatform.member.projects.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformProject.IRequest,
    },
  );
  typia.assert(projectList);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", projectList.pagination.current, 1);
  TestValidator.equals("page limit", projectList.pagination.limit, 20);
  TestValidator.equals(
    "total records",
    projectList.pagination.records,
    projectCount,
  );
  TestValidator.equals("total pages", projectList.pagination.pages, 1);
  // 6. Validate all created projects are returned
  TestValidator.equals(
    "project count matches",
    projectList.data.length,
    projectCount,
  );
  // 7. Validate projects are sorted by created_at descending
  const sortedProjects = [...createdProjects].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  for (let i = 0; i < projectList.data.length; i++) {
    TestValidator.equals(
      `project ${i} id matches`,
      projectList.data[i].id,
      sortedProjects[i].id,
    );
  }
  // 8. Validate each project summary contains required fields with business logic checks
  for (const projectSummary of projectList.data) {
    // Business rule: name must be non-empty
    TestValidator.predicate(
      "name is non-empty",
      projectSummary.name.length > 0,
    );
    // Business rule: status must be valid enum value
    TestValidator.predicate(
      "status is valid enum",
      ["active", "archived", "completed"].includes(projectSummary.status),
    );
    // Validate organization reference matches
    TestValidator.equals(
      "organization id matches",
      projectSummary.organization.id,
      organization.id,
    );
    TestValidator.equals(
      "organization name matches",
      projectSummary.organization.name,
      organization.name,
    );
  }
}
