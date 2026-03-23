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

export async function test_api_role_update_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register members in the same organization
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member1);
  // 2. Create two custom roles in the same organization
  const role1 = await api.functional.hrmTracker.member.roles.update(
    member1Connection,
    {
      roleId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
        is_custom: true,
        is_default: false,
      } satisfies IHrmTrackerRole.IUpdate,
    },
  );
  typia.assert(role1);
  const role2 = await api.functional.hrmTracker.member.roles.update(
    member1Connection,
    {
      roleId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
        is_custom: true,
        is_default: false,
      } satisfies IHrmTrackerRole.IUpdate,
    },
  );
  typia.assert(role2);
  // 3. Attempt to update role1's name to match role2's name (duplicate within org)
  await TestValidator.error("duplicate role name rejection", async () => {
    await api.functional.hrmTracker.member.roles.update(member1Connection, {
      roleId: role1.id,
      body: {
        name: role2.name,
        description: role1.description,
        is_custom: role1.is_custom,
        is_default: role1.is_default,
      } satisfies IHrmTrackerRole.IUpdate,
    });
  });
  // 4. Verify original role data remains unchanged
  const updatedRole1 = await api.functional.hrmTracker.member.roles.update(
    member1Connection,
    {
      roleId: role1.id,
      body: {
        name: role1.name,
        description: role1.description,
        is_custom: role1.is_custom,
        is_default: role1.is_default,
      } satisfies IHrmTrackerRole.IUpdate,
    },
  );
  typia.assert(updatedRole1);
  TestValidator.equals(
    "original role name preserved",
    updatedRole1.name,
    role1.name,
  );
}
