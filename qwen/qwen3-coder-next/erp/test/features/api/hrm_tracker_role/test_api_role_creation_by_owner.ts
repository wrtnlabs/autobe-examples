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

export async function test_api_role_creation_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and login
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(owner);
  // 2. Create custom role
  const role = await api.functional.hrmTracker.member.roles.create(
    ownerConnection,
    {
      body: {
        name: "Project Coordinator",
        description: "Coordinates project tasks and milestones",
        permissions: ["project:read", "task:assign"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Validate role properties
  TestValidator.equals("role name", role.name, "Project Coordinator");
  TestValidator.equals(
    "role description",
    role.description,
    "Coordinates project tasks and milestones",
  );
  TestValidator.equals("is_custom", role.is_custom, true);
  TestValidator.equals("is_default", role.is_default, false);
}
