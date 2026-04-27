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

export async function test_api_builtin_role_rename_rejected(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Register a member with known credentials
  //----
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  //----
  // 2. Create an organization — auto-creates built-in roles (Owner, Manager, Employee)
  //----
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  //----
  // 3. Login again to get updated IAuthorized with employees populated
  //----
  const freshConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_login(freshConnection, {
      body: {
        email,
        password,
        href: "",
        referrer: "",
      } satisfies IHrmTimeTrackingMember.ILogin,
    });
  typia.assert(authorized);
  //----
  // 4. Extract the Owner built-in role from the employee record
  //----
  const ownerEmployee: IHrmTimeTrackingEmployee.ISummary | undefined =
    authorized.employees.find(
      (emp) =>
        emp.role.type === "built_in" &&
        emp.role.organization.id === organization.id,
    );
  TestValidator.predicate(
    "member should be owner employee",
    ownerEmployee !== undefined,
  );
  const ownerRole: IHrmTimeTrackingRole.ISummary = ownerEmployee!.role;
  TestValidator.equals("owner role is built-in", ownerRole.type, "built_in");
  //----
  // 5. Verify that renaming a built-in role is rejected with 422
  //----
  await TestValidator.httpError(
    "built-in role rename should be rejected",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.roles.update(
        freshConnection,
        {
          organizationId: organization.id,
          roleId: ownerRole.id,
          body: {
            name: "Senior Employee",
            permissionCodes: ["project:view", "time:manage"],
          } satisfies IHrmTimeTrackingRole.IUpdate,
        },
      );
    },
  );
  //----
  // 6. Verify that the role remains unchanged after the failed update
  //----
  const updatedAuthorized: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_login(freshConnection, {
      body: {
        email,
        password,
        href: "",
        referrer: "",
      } satisfies IHrmTimeTrackingMember.ILogin,
    });
  typia.assert(updatedAuthorized);
  const updatedEmployee: IHrmTimeTrackingEmployee.ISummary | undefined =
    updatedAuthorized.employees.find(
      (emp) =>
        emp.role.type === "built_in" &&
        emp.role.organization.id === organization.id,
    );
  TestValidator.predicate(
    "owner employee still exists after failed rename",
    updatedEmployee !== undefined,
  );
  TestValidator.equals(
    "owner role name unchanged",
    updatedEmployee!.role.name,
    ownerRole.name,
  );
}
