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
 * Test retrieving all project members assigned to a specific project.
 *
 * Validates the complete project member retrieval workflow including member authentication, project creation, and member list retrieval. Ensures that the response includes complete member information with employee details (name, position, department, employment type, status), assigned role (member or project-lead), and join date (created_at). Validates pagination metadata is correct showing total member count, current page, limit, and total pages. Confirms members are ordered by created_at descending (newest first) and all members are returned regardless of role type.
 *
 * Special attention is given to verifying that the employee summary information is properly nested including member reference, role assignment, and optional department. The pagination metadata must accurately reflect the total count of members and provide correct navigation information.
 *
 * 1. Member registers with email and credentials to obtain authentication.
 * 2. Member creates a project to assign members to.
 * 3. Member retrieves all project members using the members.index endpoint.
 * 4. Validates response structure includes data array and pagination metadata.
 * 5. Validates each member contains employee summary with required fields.
 * 6. Validates pagination metadata shows correct total count and page information.
 */
export async function test_api_project_member_list_all_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Retrieve all project members
  const membersResponse =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          take: 100,
          skip: 0,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(membersResponse);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    membersResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    membersResponse.pagination.current === 1,
  );
  TestValidator.predicate("limit is set", membersResponse.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    membersResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    membersResponse.pagination.pages >= 0,
  );
  // 5. Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(membersResponse.data),
  );
  // 6. Validate each member structure if members exist
  if (membersResponse.data.length > 0) {
    for (const member of membersResponse.data) {
      // Validate employee summary exists with required nested relations
      TestValidator.predicate("employee exists", member.employee !== undefined);
      TestValidator.predicate(
        "employee member exists",
        member.employee.member !== undefined,
      );
      TestValidator.predicate(
        "employee role exists",
        member.employee.role !== undefined,
      );
      // Validate member role is valid business value
      TestValidator.predicate(
        "member role is member or project-lead",
        member.role === "member" || member.role === "project-lead",
      );
      // Validate department structure if present (optional field)
      if (
        member.employee.department !== null &&
        member.employee.department !== undefined
      ) {
        TestValidator.predicate(
          "department has id",
          member.employee.department.id !== undefined,
        );
        TestValidator.predicate(
          "department has name",
          member.employee.department.name !== undefined,
        );
      }
    }
    // 7. Validate ordering by created_at descending (newest first)
    if (membersResponse.data.length > 1) {
      for (let i = 0; i < membersResponse.data.length - 1; i++) {
        const current = new Date(membersResponse.data[i].created_at).getTime();
        const next = new Date(membersResponse.data[i + 1].created_at).getTime();
        TestValidator.predicate(
          `members ordered by created_at descending at index ${i}`,
          current >= next,
        );
      }
    }
  }
  // 8. Validate pagination consistency
  TestValidator.predicate(
    "data length matches records for single page",
    membersResponse.data.length <= membersResponse.pagination.records,
  );
}
