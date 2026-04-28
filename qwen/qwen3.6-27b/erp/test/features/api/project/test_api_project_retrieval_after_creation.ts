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

/**
 * Test the happy path of retrieving a project by its unique ID.
 *
 * Authenticates as a member and creates a new project with name, color_code, and optional budget/description/dates. Retrieves the project using the returned project ID. Verifies the response contains all expected fields: id (UUID), name, description, color_code, budget, status (should be 'active'), start_date, end_date, organization summary object, created_at, updated_at, and deleted_at (null). Validates that the returned data matches the input provided during creation, with server-generated fields properly populated.
 *
 * 1. Authenticate member via join endpoint.
 * 2. Create project with randomized name, color code, description, budget, and date range.
 * 3. Retrieve project using the created project's unique ID.
 * 4. Validate retrieved fields match input and server-populated fields are correct.
 */
export async function test_api_project_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create project
  const createBody: IHrmPlatformProject.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    color_code: "#" + RandomGenerator.alphabets(6),
    description: RandomGenerator.content({ paragraphs: 2 }),
    budget: 100,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies IHrmPlatformProject.ICreate;
  const createdProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.create(memberConnection, {
      body: createBody,
    });
  typia.assert(createdProject);
  // 3. Retrieve project
  const retrievedProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.at(memberConnection, {
      projectId: createdProject.id,
    });
  typia.assert(retrievedProject);
  // 4. Validate response
  TestValidator.equals(
    "id matches created",
    retrievedProject.id,
    createdProject.id,
  );
  TestValidator.equals(
    "name matches input",
    retrievedProject.name,
    createBody.name,
  );
  TestValidator.equals(
    "color_code matches input",
    retrievedProject.color_code,
    createBody.color_code,
  );
  TestValidator.equals("status is active", retrievedProject.status, "active");
  TestValidator.equals(
    "description matches input",
    retrievedProject.description,
    createBody.description,
  );
  TestValidator.equals(
    "budget matches input",
    retrievedProject.budget,
    createBody.budget,
  );
  TestValidator.equals(
    "start_date matches input",
    retrievedProject.start_date,
    createBody.start_date,
  );
  TestValidator.equals(
    "end_date matches input",
    retrievedProject.end_date,
    createBody.end_date,
  );
  TestValidator.equals("deleted_at is null", retrievedProject.deleted_at, null);
  TestValidator.predicate(
    "organization summary exists",
    () => retrievedProject.organization.id.length > 0,
  );
}
