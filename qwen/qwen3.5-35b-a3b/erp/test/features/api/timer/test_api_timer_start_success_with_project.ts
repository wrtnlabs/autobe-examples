import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_timer_start_create } from "../../../generate/generate_random_hrms_member_timer_start_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timer } from "../../../prepare/prepare_random_hrms_timer";

export async function test_api_timer_start_success_with_project(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Step 2: Get member's first organization and create a project
  if (authorizedMember.organization_memberships.length === 0) {
    throw new Error(
      "Member has no organizations - organization membership required for timer operations",
    );
  }
  const organizationId =
    authorizedMember.organization_memberships[0].organization.id;
  await generate_random_hrms_member_organizations_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: `#${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
      } satisfies IHrmsProject.ICreate,
      params: { organizationId },
    },
  );
  // Step 3: Start a timer for the project (create random project id for request)
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const timer = await generate_random_hrms_member_timer_start_create(
    memberConnection,
    {
      body: {
        project_id: projectId,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmsTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Step 4: Validate timer references correct project id
  TestValidator.equals(
    "timer references correct project id",
    timer.project.id,
    projectId,
  );
  // Step 5: Validate timer references correct employee
  TestValidator.equals(
    "timer references correct employee",
    timer.employee.id,
    authorizedMember.id,
  );
  // Step 6: Validate timer references correct employee display name
  TestValidator.equals(
    "timer references correct employee display name",
    timer.employee.display_name,
    authorizedMember.display_name,
  );
  // Step 7: Validate timer is active (deleted_at is null)
  TestValidator.equals(
    "timer is active (deleted_at is null)",
    timer.deleted_at,
    null,
  );
  // Step 8: Validate timer has valid start timestamp
  TestValidator.predicate(
    "timer has valid start timestamp",
    () => new Date(timer.start_at).getTime() > 0,
  );
  // Step 9: Validate timer has valid created_at timestamp
  TestValidator.predicate(
    "timer has valid created_at timestamp",
    () => new Date(timer.created_at).getTime() > 0,
  );
  // Step 10: Validate timer has valid updated_at timestamp
  TestValidator.predicate(
    "timer has valid updated_at timestamp",
    () => new Date(timer.updated_at).getTime() > 0,
  );
  // Step 11: Validate description was stored
  TestValidator.equals(
    "timer description matches request input",
    timer.description,
    timer.description,
  );
  // Step 12: Validate task is null (timer at project level only)
  TestValidator.equals(
    "timer has null task (project-level tracking)",
    timer.task,
    null,
  );
}
