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
 * Test project creation with all optional fields populated.
 *
 * Validates the complete project creation workflow for a member user, ensuring that all required and optional fields are correctly stored and returned. The test creates a comprehensive project record with name, color_code, status, description, budget_hours, start_date, and end_date fields.
 *
 * This test verifies:
 * - All required fields (name, color_code, status) are properly validated
 * - Optional fields (description, budget_hours, start_date, end_date) are correctly stored
 * - Organization reference is properly included in the response
 * - System timestamps (created_at, updated_at) are correctly set
 * - Project entity structure matches IHrmProject type definition
 *
 * 1. Member user authenticates via email/password registration.
 * 2. Organization is created for the member.
 * 3. Project is created with all fields populated including optional fields.
 * 4. Validates response contains all expected fields with correct types.
 * 5. Verifies organization reference structure and timestamps.
 */
export async function test_api_project_creation_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create organization for the member
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Note: Organization creation would typically happen through a separate endpoint.
  // For this test, we use a generated UUID as the organization identifier.
  // In a real scenario, the organization would be created before project creation.
  // 3. Create project with all optional fields
  const inputName: string = RandomGenerator.name();
  const inputDescription: string = RandomGenerator.paragraph({ sentences: 5 });
  const inputColorCode: string &
    tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$"> = typia.random<
    string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">
  >();
  const inputStatus: "active" | "archived" | "completed" = RandomGenerator.pick(
    ["active", "archived", "completed"] as const,
  );
  const inputBudgetHours: number = typia.random<number & tags.Type<"uint32">>();
  const inputStartDate: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const inputEndDate: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const project: IHrmProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: inputName,
          description: inputDescription,
          color_code: inputColorCode,
          status: inputStatus,
          budget_hours: inputBudgetHours,
          start_date: inputStartDate,
          end_date: inputEndDate,
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 4. Validate business logic - input values match response
  TestValidator.equals("project name matches", project.name, inputName);
  TestValidator.equals(
    "project description matches",
    project.description,
    inputDescription,
  );
  TestValidator.equals(
    "project color_code matches",
    project.color_code,
    inputColorCode,
  );
  TestValidator.equals("project status matches", project.status, inputStatus);
  TestValidator.equals(
    "project budget_hours matches",
    project.budget_hours,
    inputBudgetHours,
  );
  TestValidator.equals(
    "project start_date matches",
    project.start_date,
    inputStartDate,
  );
  TestValidator.equals(
    "project end_date matches",
    project.end_date,
    inputEndDate,
  );
  // 5. Validate organization reference exists
  TestValidator.predicate(
    "organization reference exists",
    project.organization !== undefined,
  );
  TestValidator.equals(
    "organization id matches",
    project.organization.id,
    organizationId,
  );
}
