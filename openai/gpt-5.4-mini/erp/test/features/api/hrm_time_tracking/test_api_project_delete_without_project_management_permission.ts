import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_delete_without_project_management_permission(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(actorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      actorConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#3366ff",
          status: "active",
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  const before = await api.functional.hrmTimeTracking.member.projects.at(
    actorConnection,
    {
      projectId: project.id,
    },
  );
  TestValidator.equals(
    "project exists before deletion attempt",
    before.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches before deletion attempt",
    before.name,
    project.name,
  );
  const forbiddenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  await TestValidator.httpError(
    "member without project management permission cannot delete project",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.erase(
        forbiddenConnection,
        {
          projectId: project.id,
        },
      );
    },
  );
  const after = await api.functional.hrmTimeTracking.member.projects.at(
    actorConnection,
    {
      projectId: project.id,
    },
  );
  TestValidator.equals(
    "project still exists after failed deletion",
    after.id,
    project.id,
  );
  TestValidator.equals(
    "project unchanged after failed deletion",
    after.name,
    project.name,
  );
}
