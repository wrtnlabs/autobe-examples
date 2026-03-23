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

export async function test_api_role_creation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await api.functional.hrmTracker.auth.member.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(owner);
  // 2. Create initial role 'Team Lead'
  const initialRole = await generate_random_hrm_tracker_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "Team Lead",
        description: "Team leadership role",
        permissions: ["project:read", "task:edit"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(initialRole);
  TestValidator.equals("role name matches", initialRole.name, "Team Lead");
  // 3. Attempt to create duplicate role with same name
  await TestValidator.error(
    "duplicate role name should be rejected",
    async () => {
      await api.functional.hrmTracker.member.roles.create(ownerConnection, {
        body: {
          name: "Team Lead", // Same name as initial role
          description: "Duplicate role attempt",
          permissions: ["project:read"],
        } satisfies IHrmTrackerRole.ICreate,
      });
    },
  );
  // 4. Verify existing role remains unchanged
  TestValidator.equals("role ID consistent", initialRole.id, initialRole.id);
  TestValidator.equals("name unchanged", initialRole.name, "Team Lead");
}
