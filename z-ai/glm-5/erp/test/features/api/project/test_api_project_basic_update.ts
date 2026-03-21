import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test project update functionality.
 *
 * Workflow:
 * 1. Member joins and creates organization (becomes owner)
 * 2. Create initial project with random data
 * 3. Update project with new name, description, and color_code
 * 4. Verify all fields are updated correctly
 */
export async function test_api_project_basic_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create initial project
  const initialProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(initialProject);
  // Step 3: Prepare update values (different from initial)
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#33FF57",
  } satisfies IErpHrmProject.IUpdate;
  // Step 4: Update project
  const updatedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: initialProject.id,
      body: updateBody,
    },
  );
  typia.assert(updatedProject);
  // Step 5: Verify basic identity
  TestValidator.equals(
    "project id unchanged",
    updatedProject.id,
    initialProject.id,
  );
  // Step 6: Verify updated name
  TestValidator.equals("name updated", updatedProject.name, updateBody.name);
  // Step 7: Verify updated description
  TestValidator.equals(
    "description updated",
    updatedProject.description,
    updateBody.description,
  );
  // Step 8: Verify updated color code
  TestValidator.equals(
    "color code updated",
    updatedProject.colorCode,
    updateBody.color_code,
  );
  // Step 9: Verify status remains 'active'
  TestValidator.equals(
    "status remains active",
    updatedProject.status,
    "active",
  );
  // Step 10: Verify updated_at > created_at
  const createdAt = new Date(updatedProject.createdAt).getTime();
  const updatedAt = new Date(updatedProject.updatedAt).getTime();
  TestValidator.predicate(
    "updated_at after created_at",
    updatedAt >= createdAt,
  );
  // Step 11: Verify organization reference exists
  TestValidator.predicate(
    "organization exists",
    updatedProject.organization !== null,
  );
  // Step 12: Verify computed fields exist
  TestValidator.predicate(
    "tasks array exists",
    Array.isArray(updatedProject.tasks),
  );
  TestValidator.predicate(
    "timelogsCount exists",
    typeof updatedProject.timelogsCount === "number",
  );
  TestValidator.predicate(
    "membersCount exists",
    typeof updatedProject.membersCount === "number",
  );
}
