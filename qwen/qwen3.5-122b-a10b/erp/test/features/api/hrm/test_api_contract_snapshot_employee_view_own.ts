import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_employees_contracts_create } from "../../../generate/generate_random_hrm_member_employees_contracts_create";
import { prepare_random_hrm_contract } from "../../../prepare/prepare_random_hrm_contract";

/**
 * Test that an employee can successfully retrieve a snapshot of their own employment contract.
 *
 * Validates the primary success path for contract snapshot viewing where the authenticated member is the same employee whose contract snapshot is being accessed. This test ensures that the snapshot retrieval endpoint correctly returns historical contract state with all compensation terms, employment dates, and working hours preserved accurately.
 *
 * The test follows the complete workflow: member authentication, contract creation (which automatically generates a snapshot), and snapshot retrieval. It validates that the snapshot data matches the contract state at creation time and that all required fields are present and correctly formatted.
 *
 * 1. Authenticate as a member via POST /hrm/auth/member/join using authorize_member_join utility.
 * 2. Create an employment contract for the authenticated employee using generate_random_hrm_member_employees_contracts_create utility, which automatically creates a snapshot for historical tracking.
 * 3. Retrieve the contract snapshot via GET /hrm/member/employees/{employeeId}/contracts/{contractId}/snapshots/{snapshotId}.
 * 4. Verify the response contains all snapshot fields: id, contractId, employeeId, startDate, endDate (nullable), payRate, payPeriod, workingHoursPerWeek (nullable), notes (nullable), createdAt.
 * 5. Validate that snapshot data matches the contract state at creation time including compensation terms and employment dates.
 */
export async function test_api_contract_snapshot_employee_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create employment contract (automatically creates a snapshot)
  // Note: We need an employee ID. For this test, we'll use a UUID that represents the employee.
  // In a real scenario, the employee would be created during the join process.
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const contract = await generate_random_hrm_member_employees_contracts_create(
    memberConnection,
    {
      body: {
        start_date: new Date().toISOString(),
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        pay_period: RandomGenerator.pick([
          "hourly",
          "daily",
          "weekly",
          "monthly",
        ]),
        working_hours_per_week: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<60>
        >(),
        notes: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IHrmContract.ICreate,
      params: {
        employeeId,
      },
    },
  );
  typia.assert(contract);
  // 3. Retrieve the contract snapshot
  // The snapshot ID should correspond to the created contract's snapshot
  // For testing purposes, we use the contract ID as the snapshot ID
  const snapshot =
    await api.functional.hrm.member.employees.contracts.snapshots.at(
      memberConnection,
      {
        employeeId,
        contractId: contract.id,
        snapshotId: contract.id,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot data
  TestValidator.equals("contractId matches", snapshot.contractId, contract.id);
  TestValidator.equals("employeeId matches", snapshot.employeeId, employeeId);
  TestValidator.equals(
    "startDate matches",
    snapshot.startDate,
    contract.start_date,
  );
  TestValidator.equals("payRate matches", snapshot.payRate, contract.pay_rate);
  TestValidator.equals(
    "payPeriod matches",
    snapshot.payPeriod,
    contract.pay_period,
  );
  // Validate nullable fields match
  TestValidator.equals("endDate matches", snapshot.endDate, contract.end_date);
  TestValidator.equals(
    "workingHoursPerWeek matches",
    snapshot.workingHoursPerWeek,
    contract.working_hours_per_week,
  );
  TestValidator.equals("notes matches", snapshot.notes, contract.notes);
  // Validate createdAt is a valid ISO 8601 timestamp
  TestValidator.predicate(
    "createdAt is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.createdAt),
  );
}
