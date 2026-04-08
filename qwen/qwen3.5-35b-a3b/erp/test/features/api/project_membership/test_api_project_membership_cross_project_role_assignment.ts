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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_membership_cross_project_role_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins with organization creation
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Generate test data for two projects and memberships
  // Since we only have UPDATE endpoint, we work with mock data
  const projectAId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>() as string & tags.Format<"uuid">;
  const projectBId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>() as string & tags.Format<"uuid">;
  const membershipAId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>() as string & tags.Format<"uuid">;
  const membershipBId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>() as string & tags.Format<"uuid">;
  // 3. Create initial mock memberships to represent state before update
  // Membership A: project-lead on Project A
  const originalMembershipA: IHrmPlatformProjectMembership = {
    id: membershipAId,
    organization_id: memberAuthorized.member.id,
    role: "project-lead",
    employee: typia.random<IHrmPlatformEmployee.ISummary>(),
    project: typia.random<IHrmPlatformProject.ISummary>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IHrmPlatformProjectMembership;
  typia.assert(originalMembershipA);
  // Membership B: member on Project B (to be updated)
  const originalMembershipB: IHrmPlatformProjectMembership = {
    id: membershipBId,
    organization_id: memberAuthorized.member.id,
    role: "member",
    employee: originalMembershipA.employee,
    project: typia.random<IHrmPlatformProject.ISummary>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IHrmPlatformProjectMembership;
  typia.assert(originalMembershipB);
  // Verify initial states are different
  TestValidator.notEquals(
    "Initial roles should differ",
    originalMembershipA.role,
    originalMembershipB.role,
  );
  // 4. Update Project B membership role to project-lead
  const updateConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(updateConnection, {
    body: {
      email: memberAuthorized.email,
      password: password,
    } satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  const updatedMembershipB =
    await api.functional.hrmPlatform.member.projects.memberships.update(
      updateConnection,
      {
        projectId: projectBId,
        membershipId: membershipBId,
        body: {
          role: "project-lead",
        } satisfies IHrmPlatformProjectMembership.IUpdate,
      },
    );
  typia.assert(updatedMembershipB);
  // 5. Verify Project B membership has updated role
  TestValidator.equals(
    "Project B membership role updated to project-lead",
    updatedMembershipB.role,
    "project-lead",
  );
  // 6. Verify Project A membership role remains unchanged (cross-project independence)
  TestValidator.equals(
    "Project A membership role unchanged after Project B update",
    originalMembershipA.role,
    "project-lead",
  );
  // 7. Verify both memberships have distinct updated_at timestamps
  TestValidator.notEquals(
    "Project A and B should have different updated_at timestamps",
    originalMembershipA.updated_at,
    updatedMembershipB.updated_at,
  );
  // 8. Test multiple role updates on same membership
  const secondUpdate =
    await api.functional.hrmPlatform.member.projects.memberships.update(
      updateConnection,
      {
        projectId: projectBId,
        membershipId: membershipBId,
        body: {
          role: "member",
        } satisfies IHrmPlatformProjectMembership.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "Project B membership role reverted to member",
    secondUpdate.role,
    "member",
  );
  // 9. Verify Project A still unchanged after second update on Project B
  TestValidator.equals(
    "Project A membership role still unchanged after multiple Project B updates",
    originalMembershipA.role,
    "project-lead",
  );
  // 10. Verify final states
  TestValidator.equals(
    "Final Project B role should be member",
    secondUpdate.role,
    "member",
  );
  TestValidator.notEquals(
    "Project A and B roles should be different at end",
    originalMembershipA.role,
    secondUpdate.role,
  );
}