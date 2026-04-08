import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";

/**
 * Test project update timeline consistency business rule.
 *
 * Validates the project timeline constraint where end_date must be greater than or equal to start_date when both are provided. This ensures logical timeline configurations for project planning and prevents invalid date ranges that could cause scheduling conflicts.
 *
 * The test follows a complete workflow: member authentication, project creation with start date, project update with end date, and validation of the timeline consistency constraint.
 *
 * 1. Authenticate as member user with email and password credentials.
 * 2. Create a project with start_date set to a future date.
 * 3. Update the project with end_date after start_date.
 * 4. Verify the project is successfully updated with valid timeline.
 * 5. Confirm end_date >= start_date constraint is maintained.
 */
export async function test_api_project_update_timeline_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(auth);
  // 2. Create project with start_date
  const startDate: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const project: IHrmProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          start_date: startDate.toISOString(),
        },
        params: {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(project);
  // 3. Update project with end_date after start_date
  const endDate: Date = new Date(
    startDate.getTime() + 14 * 24 * 60 * 60 * 1000,
  ); // 14 days after start
  const updated: IHrmProject =
    await api.functional.hrm.member.organizations.projects.update(
      memberConnection,
      {
        organizationId: project.organization.id,
        projectId: project.id,
        body: {
          name: project.name,
          color_code: project.color_code,
          end_date: endDate.toISOString(),
        } satisfies IHrmProject.IUpdate,
      },
    );
  typia.assert(updated);
  // 4. Validate timeline consistency - end_date >= start_date
  TestValidator.predicate(
    "end_date must be greater than or equal to start_date",
    () => {
      if (updated.start_date && updated.end_date) {
        return new Date(updated.end_date) >= new Date(updated.start_date);
      }
      return true;
    },
  );
  // 5. Verify specific date values
  TestValidator.equals(
    "start_date matches original",
    updated.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "end_date is after start_date",
    new Date(updated.end_date!).getTime() >=
      new Date(updated.start_date!).getTime(),
    true,
  );
}
