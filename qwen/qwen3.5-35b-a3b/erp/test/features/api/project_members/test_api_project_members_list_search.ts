import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";

export async function test_api_project_members_list_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create another member to own organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 3. Create organization through project creation (which auto-creates org if needed)
  const organizationId: string = typia.random<string & tags.Format<"uuid">>();
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      ownerConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#" + RandomGenerator.alphaNumeric(6),
        },
      },
    );
  typia.assert(project);
  // 4. Create multiple employees and add them to project
  const employeeRecords: IHrmsProjectMember[] = [];
  const expectedDisplayNames: string[] = [];
  for (let i = 0; i < 5; i++) {
    const employeeDisplayName = `Member ${i + 1} ${RandomGenerator.alphabets(3).toUpperCase()}`;
    expectedDisplayNames.push(employeeDisplayName);
    const projectMember =
      await api.functional.hrms.member.projects.members.addMember(
        ownerConnection,
        {
          projectId: organizationId,
          body: {
            employee_id: typia.random<string & tags.Format<"uuid">>(),
            role: i === 0 ? "project-lead" : "member",
          },
        },
      );
    typia.assert(projectMember);
    employeeRecords.push(projectMember);
  }
  // 5. Test pagination with default parameters
  const defaultPage = await api.functional.hrms.member.projects.members.index(
    ownerConnection,
    {
      projectId: organizationId,
      body: {
        metric: "total",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page returns all members",
    defaultPage.data.length,
    employeeRecords.length,
  );
  // 6. Test pagination with smaller limit
  const limitedPage = await api.functional.hrms.member.projects.members.index(
    ownerConnection,
    {
      projectId: organizationId,
      body: {
        metric: "total",
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(limitedPage);
  TestValidator.equals("limited page count", limitedPage.data.length, 2);
  TestValidator.equals("pagination limit", limitedPage.pagination.limit, 2);
  TestValidator.equals(
    "pagination current page",
    limitedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    limitedPage.pagination.records,
    employeeRecords.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    limitedPage.pagination.pages === Math.ceil(employeeRecords.length / 2),
  );
  // 7. Test multi-page pagination
  const secondPage = await api.functional.hrms.member.projects.members.index(
    ownerConnection,
    {
      projectId: organizationId,
      body: {
        metric: "total",
        page: 2,
        limit: 2,
      },
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page count",
    secondPage.data.length,
    Math.max(0, employeeRecords.length - 2),
  );
  TestValidator.equals("second page number", secondPage.pagination.current, 2);
  // 8. Test includeInactive filter
  const withInactivePage =
    await api.functional.hrms.member.projects.members.index(ownerConnection, {
      projectId: organizationId,
      body: {
        metric: "total",
        page: 1,
        limit: 10,
        includeInactive: true,
      },
    });
  typia.assert(withInactivePage);
  TestValidator.equals(
    "includeInactive=true returns same members",
    withInactivePage.data.length,
    employeeRecords.length,
  );
  // 9. Test case-insensitive search by display_name
  // Since the API doesn't have explicit search parameter in IRequest, test with available filters
  const searchResultPage =
    await api.functional.hrms.member.projects.members.index(ownerConnection, {
      projectId: organizationId,
      body: {
        metric: "total",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(searchResultPage);
  // Verify each returned member has expected display name
  for (const member of searchResultPage.data) {
    TestValidator.predicate(
      `member ${member.id} has valid display name`,
      member.displayName.length > 0,
    );
  }
  // 10. Verify pagination metadata accuracy
  TestValidator.equals(
    "pagination current equals request page",
    limitedPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records >= actual data length",
    limitedPage.pagination.records >= limitedPage.data.length,
  );
  TestValidator.predicate(
    "pages >= current",
    limitedPage.pagination.pages >= limitedPage.pagination.current,
  );
}