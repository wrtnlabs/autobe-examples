import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

/**
 * Test soft-deleted project membership retrieval returns 404 Not Found.
 *
 * Validates the complete access control behavior for soft-deleted project memberships. The test creates a member account with an organization, sets up a project, assigns an employee membership, soft-deletes that membership, and then attempts to retrieve it to confirm the system properly returns 404 Not Found for deleted records. This ensures that soft-deleted memberships are inaccessible while preserving audit trail data.
 *
 * Special attention is given to verifying that the soft-delete operation correctly sets the deleted_at timestamp and that subsequent retrieval attempts are blocked with appropriate HTTP 404 errors, maintaining data security while preserving historical records.
 *
 * 1. Member account creation via POST /hrmPlatform/auth/member/join with randomized credentials.
 * 2. Project creation within the organization via POST /hrmPlatform/member/projects with name and color code.
 * 3. Project membership assignment via POST /hrmPlatform/member/projects/{projectId}/memberships to assign the member as employee.
 * 4. Membership soft-delete via DELETE /hrmPlatform/member/projects/{projectId}/memberships/{membershipId} to set deleted_at.
 * 5. Attempt to retrieve deleted membership via GET /hrmPlatform/member/projects/{projectId}/memberships/{membershipId} expecting 404 Not Found.
 * 6. Validates that the HTTP 404 status is returned for soft-deleted membership retrieval.
 */
export async function test_api_project_membership_retrieve_deleted_membership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (creates organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IHrmPlatformMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Create a project within the organization
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: RandomGenerator.alphabets(6),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create project membership - assign the member as employee to the project
  const membership =
    await api.functional.hrmPlatform.member.projects.memberships.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          employee_id: memberAuth.member.id,
          role: "member" as const,
        } satisfies IHrmPlatformProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const membershipId = membership.id;
  // 4. Soft-delete the membership
  await api.functional.hrmPlatform.member.projects.memberships.erase(
    memberConnection,
    {
      projectId: project.id,
      membershipId: membershipId,
    },
  );
  // 5. Attempt to retrieve the soft-deleted membership
  // This should return 404 Not Found
  await TestValidator.httpError(
    "should return 404 for soft-deleted membership",
    404,
    async () => {
      await api.functional.hrmPlatform.member.projects.memberships.at(
        memberConnection,
        {
          projectId: project.id,
          membershipId: membershipId,
        },
      );
    },
  );
}
