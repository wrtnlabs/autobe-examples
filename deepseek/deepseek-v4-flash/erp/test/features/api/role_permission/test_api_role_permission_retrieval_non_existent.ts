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
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_permissions_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_permissions_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_role_permission_retrieval_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role named 'Payroll Manager' with permissions ['time:approve']
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: "Payroll Manager",
          permissions: ["time:approve"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(role);
  // 4. Assign the 'time:approve' permission code to the role
  const permission =
    await generate_random_hrm_time_tracking_member_organizations_roles_permissions_create(
      memberConnection,
      {
        body: {
          permission_code: "time:approve",
        },
        params: {
          organizationId: organization.id,
          roleId: role.id,
        },
      },
    );
  typia.assert(permission);
  // 5. Attempt to retrieve a non-existent permission mapping
  await TestValidator.httpError(
    "retrieve non-existent permission returns 404",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.roles.permissions.at(
        memberConnection,
        {
          organizationId: organization.id,
          roleId: role.id,
          permissionId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
