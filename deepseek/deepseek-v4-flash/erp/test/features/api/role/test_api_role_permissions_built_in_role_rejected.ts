import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
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

export async function test_api_role_permissions_built_in_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  // 2. Create an organization (seeds built-in roles: Owner, Manager, Employee)
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-login to get updated employee records with the Owner role
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: {
        email,
        password,
        href: "",
        referrer: "",
      } satisfies IHrmTimeTrackingMember.ILogin,
    });
  typia.assert(authorized);
  // 4. Extract the Owner (built-in) role ID from the employee record
  // The member created only one organization, so the first employee is the owner
  TestValidator.predicate(
    "member has at least one employee record",
    authorized.employees.length > 0,
  );
  const ownerRoleId: string = authorized.employees[0]!.role.id;
  // 5. Attempt to modify the built-in Owner role's permissions -> expect 403 Forbidden
  await TestValidator.httpError(
    "modifying a built-in role's permissions should be rejected with 403",
    403,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.roles.permissions.update(
        loginConnection,
        {
          organizationId: organization.id,
          roleId: ownerRoleId,
          body: {
            permissionCodes: ["org:manage"],
          } satisfies IHrmTimeTrackingRole.IUpdate,
        },
      );
    },
  );
}