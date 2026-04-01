import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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

export async function test_api_project_update_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" satisfies string & tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create initial project with basic attributes
  const initialProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3498db",
          status: "active",
          description: RandomGenerator.content({ paragraphs: 2 }),
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(initialProject);
  // 3. Full update - modify all attributes
  const fullUpdateInput = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    color_code: "#e74c3c",
    status: "active",
    budget_hours: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<200>
    >(),
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHrmPlatformProject.IUpdate;
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: initialProject.id,
      body: fullUpdateInput,
    });
  typia.assert(updatedProject);
  // 4. Validate full update response
  TestValidator.equals(
    "project id preserved",
    updatedProject.id,
    initialProject.id,
  );
  TestValidator.equals(
    "name updated",
    updatedProject.name,
    fullUpdateInput.name,
  );
  TestValidator.equals(
    "description updated",
    updatedProject.description,
    fullUpdateInput.description,
  );
  TestValidator.equals(
    "color_code updated",
    updatedProject.color_code,
    fullUpdateInput.color_code,
  );
  TestValidator.equals(
    "status remains active",
    updatedProject.status,
    fullUpdateInput.status,
  );
  TestValidator.equals(
    "organization preserved",
    updatedProject.organization.id,
    initialProject.organization.id,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(updatedProject.updated_at) > new Date(initialProject.updated_at),
  );
  // 5. Partial update - only name and description
  const partialUpdateInput = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHrmPlatformProject.IUpdate;
  const partiallyUpdatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: updatedProject.id,
      body: partialUpdateInput,
    });
  typia.assert(partiallyUpdatedProject);
  // 6. Validate partial update preserves other fields
  TestValidator.equals(
    "name changed in partial update",
    partiallyUpdatedProject.name,
    partialUpdateInput.name,
  );
  TestValidator.equals(
    "description changed in partial update",
    partiallyUpdatedProject.description,
    partialUpdateInput.description,
  );
  TestValidator.equals(
    "color_code preserved in partial update",
    partiallyUpdatedProject.color_code,
    updatedProject.color_code,
  );
  TestValidator.equals(
    "status preserved in partial update",
    partiallyUpdatedProject.status,
    updatedProject.status,
  );
  TestValidator.equals(
    "budget_hours preserved in partial update",
    partiallyUpdatedProject.budget_hours,
    updatedProject.budget_hours,
  );
  TestValidator.equals(
    "start_date preserved in partial update",
    partiallyUpdatedProject.start_date,
    updatedProject.start_date,
  );
  TestValidator.equals(
    "end_date preserved in partial update",
    partiallyUpdatedProject.end_date,
    updatedProject.end_date,
  );
  TestValidator.predicate(
    "updated_at refreshed in partial update",
    new Date(partiallyUpdatedProject.updated_at) >
      new Date(updatedProject.updated_at),
  );
}
