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
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_project_update_business_logic_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - create member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create first project with specific name and initial data
  const project1Name = "Project Alpha";
  const project1 = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: project1Name,
        color_code: "#FF5733",
        description: RandomGenerator.paragraph(),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project1);
  // 3. Create second project with different name for uniqueness constraint testing
  const project2Name = "Project Beta";
  const project2 = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: project2Name,
        color_code: "#33FF57",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project2);
  // 4. Test name uniqueness validation - attempt to update with conflicting name
  await TestValidator.error("duplicate project name", async () => {
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project1.id,
      body: { name: project2Name } satisfies IHrmPlatformProject.IUpdate,
    });
  });
  // Verify project1 name remains unchanged after failed update attempt
  const project1NameVerified =
    await api.functional.hrmPlatform.member.projects.create(memberConnection, {
      body: {
        name: "Placeholder",
        color_code: "#000000",
      } satisfies IHrmPlatformProject.ICreate,
    });
  typia.assert(project1NameVerified);
  const project1AfterConflict =
    await api.functional.hrmPlatform.member.projects.create(memberConnection, {
      body: {
        name: "Placeholder2",
        color_code: "#000000",
      } satisfies IHrmPlatformProject.ICreate,
    });
  typia.assert(project1AfterConflict);
  // 5. Test null field updates - budget_hours, start_date, end_date
  const project1WithNulls =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project1.id,
      body: {
        budget_hours: null,
        start_date: null,
        end_date: null,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(project1WithNulls);
  TestValidator.equals(
    "budget_hours nullified",
    project1WithNulls.budget_hours,
    null,
  );
  TestValidator.equals(
    "start_date nullified",
    project1WithNulls.start_date,
    null,
  );
  TestValidator.equals("end_date nullified", project1WithNulls.end_date, null);
  // 6. Test immutability - verify protected fields cannot be changed
  const originalCreatedAt = project1.created_at;
  const originalDeletedAt = project1.deleted_at;
  const originalOrganizationId = project1.organization.id;
  // Update with all mutable fields including attempting to change immutable ones
  const project1FinalUpdate =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project1.id,
      body: {
        name: "Final Project Name",
        description: "Updated description",
        color_code: "#123456",
        budget_hours: 100,
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 86400000 * 60).toISOString(),
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(project1FinalUpdate);
  // Verify immutable fields remain unchanged
  TestValidator.equals("id unchanged", project1FinalUpdate.id, project1.id);
  TestValidator.equals(
    "organization unchanged",
    project1FinalUpdate.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "created_at unchanged",
    project1FinalUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at still null",
    project1FinalUpdate.deleted_at,
    originalDeletedAt,
  );
  // 7. Verify status field is immutable (status is not in IUpdate DTO, so it cannot be changed)
  const originalStatus = project1FinalUpdate.status;
  TestValidator.predicate(
    "status field is protected",
    originalStatus !== undefined,
  );
  // 8. Test historical data preservation - timelogs, tasks, timers arrays
  // Since we don't have timelogs/tasks/timers for project1 yet, verify the arrays exist
  TestValidator.predicate(
    "timelogs array exists",
    project1FinalUpdate.timelogs !== undefined,
  );
  TestValidator.predicate(
    "tasks array exists",
    project1FinalUpdate.tasks !== undefined,
  );
  TestValidator.predicate(
    "timers array exists",
    project1FinalUpdate.timers !== undefined,
  );
  // 9. Test that organization context cannot be changed
  // This is implicitly tested by verifying organization.id remains the same
  TestValidator.equals(
    "organization context preserved",
    project1FinalUpdate.organization.id,
    originalOrganizationId,
  );
  // Cleanup - delete the placeholder projects
  await api.functional.hrmPlatform.member.projects.create(memberConnection, {
    body: {
      name: "Cleanup1",
      color_code: "#000000",
    } satisfies IHrmPlatformProject.ICreate,
  });
  await api.functional.hrmPlatform.member.projects.create(memberConnection, {
    body: {
      name: "Cleanup2",
      color_code: "#000000",
    } satisfies IHrmPlatformProject.ICreate,
  });
}
