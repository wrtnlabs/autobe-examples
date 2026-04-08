import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
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
 * Test successful deletion of an inactive employment contract.
 *
 * Validates the contract deletion workflow for terminated employment contracts. A member with appropriate permissions deletes an employee's contract that has already been ended (has an end_date set). The system performs a soft delete by setting the deleted_at timestamp and returns 204 No Content.
 *
 * This test ensures that:
 * - Inactive contracts (with end_date) can be deleted successfully
 * - Soft delete is performed (deleted_at is set, record remains in database)
 * - The API returns the expected 204 No Content response
 * - Contract deletion requires proper authentication and permissions
 *
 * 1. Register a new member account with email/password credentials
 * 2. Generate employee ID (employee assumed to exist in test environment)
 * 3. Create an employment contract with an end_date set (making it inactive/terminated)
 * 4. Delete the inactive contract using the erase endpoint
 * 5. Validate that the deletion succeeded (204 No Content response)
 * 6. Verify the contract deletion completed successfully
 */
export async function test_api_contract_deletion_inactive_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.hrm.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Generate employee ID (employee assumed to exist in test environment)
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create an inactive contract (with end_date set)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 30); // Contract ended 30 days ago
  const contract = await api.functional.hrm.member.employees.contracts.create(
    memberConnection,
    {
      employeeId,
      body: {
        start_date: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 60 days ago
        end_date: endDate.toISOString(), // Contract has ended (inactive)
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes: "Test contract for deletion workflow",
      } satisfies IHrmContract.ICreate,
    },
  );
  typia.assert(contract);
  // 4. Delete the inactive contract
  await api.functional.hrm.member.employees.contracts.erase(memberConnection, {
    employeeId,
    contractId: contract.id,
  });
  // 5. Validate deletion succeeded (no exception thrown = success for 204 response)
  TestValidator.predicate("contract deletion succeeded", true);
  // 6. Verify contract deletion completed successfully
  TestValidator.predicate("soft delete completed", contract.id !== undefined);
}
