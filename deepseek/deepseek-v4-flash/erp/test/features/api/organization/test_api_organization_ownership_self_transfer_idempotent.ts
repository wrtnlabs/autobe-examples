import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
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

export async function test_api_organization_ownership_self_transfer_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(authorized);
  // 2. Create an organization (member becomes owner; employee auto-created)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-authenticate to get updated member data with employees populated
  const loginConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: "",
      referrer: "",
    },
  });
  typia.assert(refreshed);
  // 4. The owner's own employee_id from the first (and only) employee record
  const employeeId: string = refreshed.employees[0].id;
  // 5. Transfer ownership to self — should succeed (idempotent)
  const transferred =
    await api.functional.hrmTimeTracking.member.organizations.transfer_ownership.transferOwnership(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          employee_id: employeeId,
        } satisfies IHrmTimeTrackingOrganization.ITransferOwnership,
      },
    );
  typia.assert(transferred);
  // 6. Validate: owner remains the same member
  TestValidator.equals(
    "owner unchanged after self-transfer",
    transferred.owner.id,
    authorized.id,
  );
  // 7. Call again — should be idempotent
  const transferredAgain =
    await api.functional.hrmTimeTracking.member.organizations.transfer_ownership.transferOwnership(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          employee_id: employeeId,
        } satisfies IHrmTimeTrackingOrganization.ITransferOwnership,
      },
    );
  typia.assert(transferredAgain);
  // 8. Validate idempotent result
  TestValidator.equals(
    "second self-transfer returns same owner",
    transferredAgain.owner.id,
    authorized.id,
  );
}
