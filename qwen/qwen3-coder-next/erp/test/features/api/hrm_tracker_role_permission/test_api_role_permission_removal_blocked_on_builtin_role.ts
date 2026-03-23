import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
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

export async function test_api_role_permission_removal_blocked_on_builtin_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(owner);
  // 2. Create custom role with permissions to verify custom role creation works
  const customRole = await api.functional.hrmTracker.member.roles.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["project:read", "task:manage"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(customRole);
  TestValidator.equals("role is custom", customRole.is_custom, true);
  // 3. Verify built-in owner role exists and try to remove permission (should fail)
  await TestValidator.error("built-in role immutable", async () => {
    await api.functional.hrmTracker.member.roles.permissions.erase(
      ownerConnection,
      {
        roleId: customRole.id,
        permission: "project:read",
      },
    );
  });
  // 4. Verify custom role still has original permissions (confirm modification failed)
  const modifiedRole = await api.functional.hrmTracker.member.roles.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["project:read"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(modifiedRole);
  TestValidator.equals(
    "custom role created successfully",
    modifiedRole.is_custom,
    true,
  );
}
