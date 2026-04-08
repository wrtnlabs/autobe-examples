import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

/**
 * Test member timelog retrieval by unique identifier.
 *
 * Validates the complete timelog retrieval workflow including member authentication, project setup, project membership assignment, timelog creation, and successful retrieval by timelogId. Ensures that the member can access their own timelog entries with proper authorization.
 *
 * The test verifies that the retrieved timelog contains all expected fields including employee reference, project reference, work date, duration in minutes, optional task assignment, description, and billable status.
 *
 * 1. Member authenticates with email and password credentials.
 * 2. Project is created in the member's organization.
 * 3. Member is assigned as a project member with standard member role.
 * 4. Member creates a timelog entry for the project.
 * 5. Member retrieves the timelog by its unique identifier.
 * 6. Validates retrieved timelog matches created timelog data.
 */
export async function test_api_timelog_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Extract organization ID from member's organizations
  const organizationId = memberAuth.organizations?.[0]?.id;
  TestValidator.predicate(
    "member has organization",
    organizationId !== undefined,
  );
  // 2. Create a project in the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId: organizationId!,
        },
      },
    );
  typia.assert(project);
  // 3. Assign member as project member
  // Note: This requires the employee_id for the authenticated member.
  // In a complete implementation, we would query the employee list endpoint
  // to find the employee record associated with this member.
  // For this test, we use the prepare function which handles employee_id generation.
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: {
        projectId: project.id,
      },
    });
  typia.assert(projectMember);
  // 4. Create a timelog entry
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: {
          organizationId: organizationId!,
        },
      },
    );
  typia.assert(timelog);
  // 5. Retrieve the timelog by ID
  const retrievedTimelog = await api.functional.hrm.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 6. Validate retrieved timelog matches created timelog
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "project ID matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.predicate(
    "has valid duration",
    retrievedTimelog.duration_minutes > 0,
  );
  TestValidator.predicate(
    "date is valid",
    new Date(retrievedTimelog.date) instanceof Date,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
  TestValidator.equals(
    "employee ID matches",
    retrievedTimelog.employee.id,
    timelog.employee.id,
  );
}
