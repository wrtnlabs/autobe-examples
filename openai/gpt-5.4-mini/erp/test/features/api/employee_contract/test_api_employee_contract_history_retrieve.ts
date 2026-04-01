import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_contracts_create";
import { prepare_random_erp_hrm_time_employee_contract } from "../../../prepare/prepare_random_erp_hrm_time_employee_contract";

export async function test_api_employee_contract_history_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const viewerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner.${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const viewerAuthorized = await authorize_member_join(viewerConnection, {
    body: {
      email: `viewer.${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const historicalContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId },
        body: {
          startDate: new Date("2024-01-01T00:00:00.000Z").toISOString(),
          endDate: new Date("2024-12-31T00:00:00.000Z").toISOString(),
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Historical contract for read-only retrieval",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(historicalContract);
  const activeContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId },
        body: {
          startDate: new Date("2025-01-01T00:00:00.000Z").toISOString(),
          payRate: 6000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Current contract for the same employee",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(activeContract);
  const retrievedByOwner =
    await api.functional.erpHrmTime.member.employees.contracts.at(
      ownerConnection,
      {
        employeeId,
        contractId: historicalContract.id,
      },
    );
  typia.assert(retrievedByOwner);
  TestValidator.equals(
    "historical contract id",
    retrievedByOwner.id,
    historicalContract.id,
  );
  TestValidator.equals(
    "historical contract employee",
    retrievedByOwner.employee,
    historicalContract.employee,
  );
  TestValidator.equals(
    "historical contract start date",
    retrievedByOwner.startDate,
    historicalContract.startDate,
  );
  TestValidator.equals(
    "historical contract end date",
    retrievedByOwner.endDate,
    historicalContract.endDate,
  );
  TestValidator.equals(
    "historical contract pay rate",
    retrievedByOwner.payRate,
    historicalContract.payRate,
  );
  TestValidator.equals(
    "historical contract pay period",
    retrievedByOwner.payPeriod,
    historicalContract.payPeriod,
  );
  TestValidator.equals(
    "historical contract working hours",
    retrievedByOwner.workingHoursPerWeek,
    historicalContract.workingHoursPerWeek,
  );
  TestValidator.equals(
    "historical contract notes",
    retrievedByOwner.notes,
    historicalContract.notes,
  );
  TestValidator.equals(
    "historical contract createdAt",
    retrievedByOwner.createdAt,
    historicalContract.createdAt,
  );
  TestValidator.equals(
    "historical contract updatedAt",
    retrievedByOwner.updatedAt,
    historicalContract.updatedAt,
  );
  TestValidator.equals(
    "historical contract deletedAt",
    retrievedByOwner.deletedAt,
    historicalContract.deletedAt,
  );
  const retrievedByViewer =
    await api.functional.erpHrmTime.member.employees.contracts.at(
      viewerConnection,
      {
        employeeId,
        contractId: historicalContract.id,
      },
    );
  typia.assert(retrievedByViewer);
  TestValidator.equals(
    "viewer can retrieve same contract id",
    retrievedByViewer.id,
    historicalContract.id,
  );
  TestValidator.equals(
    "viewer can retrieve same contract employee",
    retrievedByViewer.employee,
    historicalContract.employee,
  );
  TestValidator.equals(
    "viewer can retrieve same contract start date",
    retrievedByViewer.startDate,
    historicalContract.startDate,
  );
  TestValidator.equals(
    "viewer can retrieve same contract end date",
    retrievedByViewer.endDate,
    historicalContract.endDate,
  );
  TestValidator.predicate(
    "historical contract end date is non-null",
    retrievedByViewer.endDate !== null,
  );
  TestValidator.predicate(
    "active contract remains ongoing or has a valid end date rule",
    retrievedByOwner.id === activeContract.id,
  );
}
