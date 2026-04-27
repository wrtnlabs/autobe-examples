import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Test that deleting a built-in role (Owner, Manager, or Employee) is blocked.
 *
 * Validates that the system rejects deletion attempts against built-in roles
 * that are seeded automatically at organization creation time. Built-in roles
 * are system-protected and cannot be removed by any member.
 *
 * The test registers a new member, creates an organization (which seeds
 * built-in roles), identifies a built-in role from the role list, attempts
 * deletion expecting a 403 Forbidden error, and then verifies the role still
 * exists after the failed attempt.
 *
 * 1. Register a new member account and authenticate.
 * 2. Create a new organization to seed built-in roles.
 * 3. List roles filtered by type='built_in' to find a built-in role.
 * 4. Attempt to delete the built-in role, expecting HTTP 403.
 * 5. Re-list roles to verify the built-in role is still present.
 */
export async function test_api_role_delete_built_in_role_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new organization (seeds built-in roles: Owner, Manager, Employee)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. List roles to find a built-in role
  const rolePage =
    await api.functional.hrmTimeTracking.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          type: "built_in",
        } satisfies IHrmTimeTrackingRole.IRequest,
      },
    );
  typia.assert(rolePage);
  const builtInRole = rolePage.data.find((r) => r.type === "built_in");
  if (builtInRole === undefined)
    throw new Error("No built-in role found in organization");
  // 4. Attempt to delete the built-in role -> expect 403 Forbidden
  await TestValidator.httpError(
    "built-in role deletion should be forbidden with 403",
    403,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.roles.erase(
        memberConnection,
        {
          organizationId: organization.id,
          roleId: builtInRole.id,
        },
      );
    },
  );
  // 5. Verify the built-in role still exists after the failed deletion attempt
  const rolePageAfter =
    await api.functional.hrmTimeTracking.member.organizations.roles.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          type: "built_in",
        } satisfies IHrmTimeTrackingRole.IRequest,
      },
    );
  typia.assert(rolePageAfter);
  const builtInRoleAfter = rolePageAfter.data.find(
    (r) => r.id === builtInRole.id,
  );
  if (builtInRoleAfter === undefined)
    throw new Error("Built-in role disappeared after failed deletion attempt");
}
