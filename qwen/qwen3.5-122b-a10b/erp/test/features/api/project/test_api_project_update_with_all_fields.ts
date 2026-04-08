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

export async function test_api_project_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authResult);
  // 2. Create initial project
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const initialProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          name: RandomGenerator.name(),
          color_code: "#FF5733",
          status: "active",
          description: "Initial project description",
          budget_hours: 100,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(initialProject);
  // 3. Update project with all fields
  const updateBody: IHrmProject.IUpdate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#33FF57",
    budget_hours: 250,
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const updatedProject =
    await api.functional.hrm.member.organizations.projects.update(
      memberConnection,
      {
        organizationId,
        projectId: initialProject.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProject);
  // 4. Verify response contains updated values
  TestValidator.equals(
    "project name updated",
    updatedProject.name,
    updateBody.name,
  );
  TestValidator.equals(
    "project description updated",
    updatedProject.description,
    updateBody.description,
  );
  TestValidator.equals(
    "project color_code updated",
    updatedProject.color_code,
    updateBody.color_code,
  );
  TestValidator.equals(
    "project budget_hours updated",
    updatedProject.budget_hours,
    updateBody.budget_hours,
  );
  TestValidator.equals(
    "project start_date updated",
    updatedProject.start_date,
    updateBody.start_date,
  );
  TestValidator.equals(
    "project end_date updated",
    updatedProject.end_date,
    updateBody.end_date,
  );
  // 5. Verify end_date >= start_date
  TestValidator.predicate(
    "end_date >= start_date",
    new Date(updatedProject.end_date!).getTime() >=
      new Date(updatedProject.start_date!).getTime(),
  );
}
