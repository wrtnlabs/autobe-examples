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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test filtering project members by role designation.
 *
 * Validates the role-based filtering functionality for project member lists. Ensures that filtering by role='project-lead' returns only members with the project-lead role, and filtering by role='member' returns only regular members. The test verifies that the filter correctly applies to the role field in project membership records and that pagination metadata accurately reflects the filtered count rather than the total member count.
 *
 * This test is critical for ensuring that project administrators can accurately view and manage team members based on their role assignments. The role filter enables efficient team management by allowing quick identification of project leads versus regular team members.
 *
 * 1. Member authenticates using join endpoint to obtain access token.
 * 2. Member creates a new project to serve as the test context.
 * 3. Query project members with role='project-lead' filter and validate all returned members have the project-lead role.
 * 4. Query project members with role='member' filter and validate all returned members have the member role.
 * 5. Validate pagination metadata records count matches filtered data array length for each role filter.
 * 6. Verify that role filtering is mutually exclusive between project-lead and member role queries.
 */
export async function test_api_project_member_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Query members with role='project-lead' filter
  const projectLeadResult =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(projectLeadResult);
  // Validate all returned members have project-lead role
  for (const member of projectLeadResult.data) {
    TestValidator.equals(
      "project-lead member role",
      member.role,
      "project-lead",
    );
  }
  // 4. Query members with role='member' filter
  const memberResult =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "member",
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(memberResult);
  // Validate all returned members have member role
  for (const member of memberResult.data) {
    TestValidator.equals("member role", member.role, "member");
  }
  // 5. Validate pagination metadata matches filtered data length
  TestValidator.equals(
    "project-lead pagination records count",
    projectLeadResult.pagination.records,
    projectLeadResult.data.length,
  );
  TestValidator.equals(
    "member pagination records count",
    memberResult.pagination.records,
    memberResult.data.length,
  );
  // 6. Verify role filtering is mutually exclusive
  const projectLeadIds = projectLeadResult.data.map((m) => m.employee.id);
  const memberIds = memberResult.data.map((m) => m.employee.id);
  // No employee should appear in both filtered results
  const overlappingIds = projectLeadIds.filter((id) => memberIds.includes(id));
  TestValidator.equals(
    "role filtering mutually exclusive",
    overlappingIds.length,
    0,
  );
}
