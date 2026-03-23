import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_roles_create } from "../../../generate/generate_random_hrm_tracker_member_roles_create";
import { prepare_random_hrm_tracker_role } from "../../../prepare/prepare_random_hrm_tracker_role";

export async function test_api_role_retrieval_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins and creates organization
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberA);
  // 2. Second member joins and creates different organization
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberB);
  // 3. First member creates a custom role in their organization
  const createdRole = await api.functional.hrmTracker.member.roles.create(
    memberAConnection,
    {
      body: {
        name: `Role_${RandomGenerator.name()}`,
        description: "Custom role for testing isolation",
        permissions: ["role:read", "role:write"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(createdRole);
  // 4. Second member attempts to retrieve the role created by first member
  // This should fail with 404 because roles are organization-scoped
  await TestValidator.error(
    "role retrieval across organizations should fail with 404",
    async () => {
      await api.functional.hrmTracker.roles.at(memberBConnection, {
        roleId: createdRole.id,
      });
    },
  );
}
