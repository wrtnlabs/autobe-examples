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

export async function test_api_project_create_duplicate_name_in_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const projectName = `project-${RandomGenerator.alphabets(8)}`;
  const firstProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: projectName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#3366ff",
          status: "active",
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(firstProject);
  TestValidator.equals(
    "project name should match",
    firstProject.name,
    projectName,
  );
  await TestValidator.error(
    "duplicate project name in same organization",
    async () => {
      await generate_random_hrm_time_tracking_member_projects_create(
        memberConnection,
        {
          body: {
            name: projectName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            colorCode: "#3366ff",
            status: "active",
          } satisfies IHrmTimeTrackingProject.ICreate,
        },
      );
    },
  );
  const secondProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `${projectName}-different`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff6633",
          status: "active",
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(secondProject);
  TestValidator.notEquals(
    "different project name should not collide",
    firstProject.name,
    secondProject.name,
  );
}
