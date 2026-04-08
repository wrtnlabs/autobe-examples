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

/**
 * Test project update isolation across multiple projects.
 *
 * Validates that updating one project doesn't affect another by creating two projects with distinct attributes, updating them independently, and verifying each maintains its own identity and values.
 *
 * 1. Member authenticates via join endpoint
 * 2. Two projects created with unique names, colors, and budgets
 * 3. Projects independently updated with new values
 * 4. Verification confirms updated projects reflect their new values while other project remains unchanged
 * 5. Both projects maintain their distinct identities throughout the process
 */
export async function test_api_project_update_multiple_projects(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {});
  typia.assert(joinResult);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResult.token.access },
  };
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project1);
  const project1NameBefore = project1.name;
  const project1ColorBefore = project1.color_code;
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project2);
  const project2NameBefore = project2.name;
  const project2ColorBefore = project2.color_code;
  TestValidator.notEquals(
    "projects have different IDs",
    project1.id,
    project2.id,
  );
  const updatedProject1Name = `Updated Project ${RandomGenerator.name()}`;
  const updatedProject1Color = `#${RandomGenerator.alphabets(6).toUpperCase()}`;
  const updatedProject1 =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project1.id,
      body: {
        name: updatedProject1Name,
        color_code: updatedProject1Color,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject1);
  TestValidator.equals(
    "project1 name updated",
    updatedProject1.name,
    updatedProject1Name,
  );
  TestValidator.equals(
    "project1 color updated",
    updatedProject1.color_code,
    updatedProject1Color,
  );
  const updatedProject2Name = `Updated Project ${RandomGenerator.name()}`;
  const updatedProject2Color = `#${RandomGenerator.alphabets(6).toUpperCase()}`;
  const updatedProject2 =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project2.id,
      body: {
        name: updatedProject2Name,
        color_code: updatedProject2Color,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject2);
  TestValidator.equals(
    "project2 name updated",
    updatedProject2.name,
    updatedProject2Name,
  );
  TestValidator.equals(
    "project2 color updated",
    updatedProject2.color_code,
    updatedProject2Color,
  );
  const freshProject1 = await api.functional.hrmPlatform.member.projects.update(
    memberConnection,
    {
      projectId: project1.id,
      body: {} satisfies IHrmPlatformProject.IUpdate,
    },
  );
  typia.assert(freshProject1);
  TestValidator.equals(
    "project1 maintains updated name after update with no changes",
    freshProject1.name,
    updatedProject1Name,
  );
  const freshProject2 = await api.functional.hrmPlatform.member.projects.update(
    memberConnection,
    {
      projectId: project2.id,
      body: {} satisfies IHrmPlatformProject.IUpdate,
    },
  );
  typia.assert(freshProject2);
  TestValidator.equals(
    "project2 maintains updated name after update with no changes",
    freshProject2.name,
    updatedProject2Name,
  );
}
