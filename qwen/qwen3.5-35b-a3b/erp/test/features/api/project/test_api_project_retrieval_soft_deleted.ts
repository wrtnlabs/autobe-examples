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

export async function test_api_project_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(auth);
  // 2. Create a project with authenticated connection
  const createConnection: api.IConnection = { host: connection.host };
  createConnection.headers!.Authorization = auth.token.access;
  const project = await api.functional.hrmPlatform.member.projects.create(
    createConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        color_code: `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        start_date: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
        end_date: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 24 * 90,
        ).toISOString(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Soft-delete the project
  const deleteConnection: api.IConnection = { host: connection.host };
  deleteConnection.headers!.Authorization = auth.token.access;
  await api.functional.hrmPlatform.member.projects.erase(deleteConnection, {
    projectId: project.id,
  });
  // 4. Retrieve the soft-deleted project
  const getProjectConnection: api.IConnection = { host: connection.host };
  getProjectConnection.headers!.Authorization = auth.token.access;
  const retrievedProject = await api.functional.hrmPlatform.member.projects.at(
    getProjectConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(retrievedProject);
  // 5. Validate response
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    project.name,
  );
  TestValidator.equals(
    "color code matches",
    retrievedProject.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "description matches",
    retrievedProject.description,
    project.description,
  );
  TestValidator.equals(
    "budget_hours matches",
    retrievedProject.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "status unchanged",
    retrievedProject.status,
    project.status,
  );
  TestValidator.equals(
    "organization matches",
    retrievedProject.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "deleted_at is populated",
    retrievedProject.deleted_at !== null,
    true,
  );
  TestValidator.equals(
    "deleted_at is valid date-time",
    new Date(retrievedProject.deleted_at!).getTime(),
    new Date(retrievedProject.deleted_at!).getTime(),
  );
  TestValidator.equals(
    "tasks array preserved",
    retrievedProject.tasks.length,
    project.tasks.length,
  );
  TestValidator.equals(
    "timelogs array preserved",
    retrievedProject.timelogs.length,
    project.timelogs.length,
  );
  TestValidator.equals(
    "timers array preserved",
    retrievedProject.timers.length,
    project.timers.length,
  );
  TestValidator.equals(
    "memberships array preserved",
    retrievedProject.memberships.length,
    project.memberships.length,
  );
}
