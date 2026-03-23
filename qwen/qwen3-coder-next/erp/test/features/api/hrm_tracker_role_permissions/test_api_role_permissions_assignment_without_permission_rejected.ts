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

export async function test_api_role_permissions_assignment_without_permission_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account without org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create custom role in member's organization using utility function
  const customRole = await generate_random_hrm_tracker_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: ["employee:view"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  // 3. Attempt to assign permissions to the custom role (should fail with 403)
  await TestValidator.httpError(
    "permission assignment without org:manage permission returns 403 Forbidden",
    403,
    async () =>
      await api.functional.hrmTracker.member.roles.permissions.create(
        memberConnection,
        {
          roleId: customRole.id,
          body: {
            permissions: ["employee:manage"],
          } satisfies IHrmTrackerRole.IAssignPermissionsRequest,
        },
      ),
  );
}
