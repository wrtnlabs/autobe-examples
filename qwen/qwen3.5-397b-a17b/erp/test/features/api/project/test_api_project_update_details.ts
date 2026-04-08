import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test updating project details successfully.
 *
 * Validates the complete project update workflow including member authentication, organization creation, project creation, and comprehensive project update operations. Ensures that all project fields can be updated correctly and that the updated_at timestamp reflects changes.
 *
 * Tests three update scenarios: full update with all fields modified, partial update with only some fields changed, and clearing optional fields by passing null values. Each scenario verifies that the response contains the expected updated values while preserving unchanged fields.
 *
 * 1. Member registers with email and credentials.
 * 2. Member creates an organization for project context.
 * 3. Member creates a project with initial values.
 * 4. Updates project with all fields (name, description, color, budget_hours, start_date, end_date).
 * 5. Verifies all fields are updated and updated_at timestamp changes.
 * 6. Performs partial update with only name and color modified.
 * 7. Verifies partial update preserves other fields.
 * 8. Clears optional fields (description, budget_hours, start_date, end_date) by passing null.
 * 9. Verifies optional fields are cleared correctly.
 */
export async function test_api_project_update_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create initial project
  const initialProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          color: "#FF5733",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          budgetHours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          startDate: new Date().toISOString(),
          endDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(initialProject);
  // 4. Full update - update all fields
  const updateData: IHrmPlatformProject.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color: "#33FF57",
    budget_hours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<200>
    >(),
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: initialProject.id,
      body: updateData,
    });
  typia.assert(updatedProject);
  // 5. Verify full update
  TestValidator.equals("name updated", updatedProject.name, updateData.name);
  TestValidator.equals(
    "description updated",
    updatedProject.description,
    updateData.description,
  );
  TestValidator.equals("color updated", updatedProject.color, updateData.color);
  TestValidator.equals(
    "budget_hours updated",
    updatedProject.budget_hours,
    updateData.budget_hours,
  );
  TestValidator.equals(
    "start_date updated",
    updatedProject.start_date,
    updateData.start_date,
  );
  TestValidator.equals(
    "end_date updated",
    updatedProject.end_date,
    updateData.end_date,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedProject.updated_at > initialProject.updated_at,
  );
  // 6. Partial update - only name and color
  const partialUpdateData: IHrmPlatformProject.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    color: "#5733FF",
  };
  const partiallyUpdatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: updatedProject.id,
      body: partialUpdateData,
    });
  typia.assert(partiallyUpdatedProject);
  // 7. Verify partial update preserves other fields
  TestValidator.equals(
    "name changed",
    partiallyUpdatedProject.name,
    partialUpdateData.name,
  );
  TestValidator.equals(
    "color changed",
    partiallyUpdatedProject.color,
    partialUpdateData.color,
  );
  TestValidator.equals(
    "description preserved",
    partiallyUpdatedProject.description,
    updatedProject.description,
  );
  TestValidator.equals(
    "budget_hours preserved",
    partiallyUpdatedProject.budget_hours,
    updatedProject.budget_hours,
  );
  TestValidator.equals(
    "start_date preserved",
    partiallyUpdatedProject.start_date,
    updatedProject.start_date,
  );
  TestValidator.equals(
    "end_date preserved",
    partiallyUpdatedProject.end_date,
    updatedProject.end_date,
  );
  // 8. Clear optional fields by passing null
  const clearUpdateData: IHrmPlatformProject.IUpdate = {
    description: null,
    budget_hours: null,
    start_date: null,
    end_date: null,
  };
  const clearedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: partiallyUpdatedProject.id,
      body: clearUpdateData,
    });
  typia.assert(clearedProject);
  // 9. Verify optional fields are cleared
  TestValidator.equals("description cleared", clearedProject.description, null);
  TestValidator.equals(
    "budget_hours cleared",
    clearedProject.budget_hours,
    null,
  );
  TestValidator.equals("start_date cleared", clearedProject.start_date, null);
  TestValidator.equals("end_date cleared", clearedProject.end_date, null);
  TestValidator.equals(
    "name preserved",
    clearedProject.name,
    partiallyUpdatedProject.name,
  );
  TestValidator.equals(
    "color preserved",
    clearedProject.color,
    partiallyUpdatedProject.color,
  );
}
