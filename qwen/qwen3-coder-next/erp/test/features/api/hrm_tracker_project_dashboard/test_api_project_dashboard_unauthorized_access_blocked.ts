import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";

export async function test_api_project_dashboard_unauthorized_access_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member and establish authenticated session
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. First member creates a project
  const project1 = await generate_random_hrm_tracker_member_projects_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: `#${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(project1);
  // 3. Create second member and establish separate authenticated session
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  // 4. Second member creates a different project
  const project2 = await generate_random_hrm_tracker_member_projects_create(
    member2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: `#${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(project2);
  // 5. Second member attempts to access first member's project dashboard (should be blocked)
  await TestValidator.error(
    "access denied: member2 cannot access project1 dashboard",
    async () => {
      await api.functional.hrmTracker.member.projects.dashboard.at(
        member2Connection,
        {
          projectId: project1.id,
        },
      );
    },
  );
  // 6. Verify first member can still access their own project dashboard
  const dashboard1 =
    await api.functional.hrmTracker.member.projects.dashboard.at(
      member1Connection,
      {
        projectId: project1.id,
      },
    );
  typia.assert(dashboard1);
  TestValidator.equals("project matches", dashboard1.id, project1.id);
  // 7. Verify second member can access their own project dashboard
  const dashboard2 =
    await api.functional.hrmTracker.member.projects.dashboard.at(
      member2Connection,
      {
        projectId: project2.id,
      },
    );
  typia.assert(dashboard2);
  TestValidator.equals("project matches", dashboard2.id, project2.id);
}
