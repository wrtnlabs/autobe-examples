import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_owner_employees_contracts_create";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { generate_random_hrm_time_tracking_owner_organizations_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_invitations_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_organization_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_organization_invitation";

export async function test_api_employee_contract_detail_owner_reads_created_contract(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoin = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(ownerJoin);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3,
        },
      },
    );
  typia.assert(organization);
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          email: invitedEmail,
          hrm_time_tracking_role_id: null,
          message: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(invitation);
  TestValidator.equals(
    "invitation email matches",
    invitation.email,
    invitedEmail,
  );
  TestValidator.equals(
    "invitation organization matches",
    invitation.organization.id,
    organization.id,
  );
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeJoin = await authorize_employee_join(employeeConnection, {
    body: {
      email: invitedEmail,
    },
  });
  typia.assert(employeeJoin);
  TestValidator.equals(
    "employee email matches invitation",
    employeeJoin.email,
    invitedEmail,
  );
  const createdContract =
    await generate_random_hrm_time_tracking_owner_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId: employeeJoin.id,
        },
        body: {
          end_date: null,
          pay_rate: 42.5,
          pay_period: "hourly",
          working_hours_per_week: 40,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(createdContract);
  const found =
    await api.functional.hrmTimeTracking.owner.employees.contracts.at(
      ownerConnection,
      {
        employeeId: employeeJoin.id,
        contractId: createdContract.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("contract id matches", found.id, createdContract.id);
  TestValidator.equals(
    "contract start_date matches",
    found.start_date,
    createdContract.start_date,
  );
  TestValidator.equals(
    "contract end_date matches",
    found.end_date,
    createdContract.end_date,
  );
  TestValidator.equals(
    "contract pay_rate matches",
    found.pay_rate,
    createdContract.pay_rate,
  );
  TestValidator.equals(
    "contract pay_period matches",
    found.pay_period,
    createdContract.pay_period,
  );
  TestValidator.equals(
    "contract working_hours_per_week matches",
    found.working_hours_per_week,
    createdContract.working_hours_per_week,
  );
  TestValidator.equals(
    "contract notes match",
    found.notes,
    createdContract.notes,
  );
  TestValidator.equals(
    "contract created_at is unchanged by read",
    found.created_at,
    createdContract.created_at,
  );
  TestValidator.equals(
    "contract updated_at is unchanged by read",
    found.updated_at,
    createdContract.updated_at,
  );
  TestValidator.equals(
    "contract deleted_at matches",
    found.deleted_at,
    createdContract.deleted_at,
  );
}
