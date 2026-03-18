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

export async function test_api_project_create_requires_project_management_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const unauthorizedBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    colorCode: "#3366ff",
    status: "active",
    budgetHours: 40,
  } satisfies IHrmTimeTrackingProject.ICreate;
  await TestValidator.error(
    "member without project management permission cannot create a project",
    async () => {
      await api.functional.hrmTimeTracking.member.projects.create(
        memberConnection,
        {
          body: unauthorizedBody,
        },
      );
    },
  );
  const authorizedConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const createdFirst =
    await api.functional.hrmTimeTracking.member.projects.create(
      authorizedConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff6633",
          status: "active",
          budgetHours: 80,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(createdFirst);
  const createdSecond =
    await api.functional.hrmTimeTracking.member.projects.create(
      authorizedConnection,
      {
        body: {
          name: `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#33aa66",
          status: "active",
          budgetHours: 120,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(createdSecond);
  TestValidator.equals(
    "project should belong to the active organization context",
    createdFirst.organization.id,
    createdSecond.organization.id,
  );
  TestValidator.predicate(
    "project organization summary should be present",
    createdFirst.organization.name.length > 0 &&
      createdFirst.organization.currency.length > 0,
  );
  TestValidator.predicate(
    "authorized project creation should produce distinct projects in the same organization",
    createdFirst.id !== createdSecond.id &&
      createdFirst.name !== createdSecond.name,
  );
}
