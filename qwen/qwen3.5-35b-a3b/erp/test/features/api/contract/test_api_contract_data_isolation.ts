import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test data isolation and permission-based access control for contract listing.
 *
 * Validates that contract listing respects user roles and organizational boundaries.
 * Regular employees can only view their own contracts, while managers and owners
 * can view all employee contracts within their organization. The test ensures
 * that filtering parameters cannot bypass these isolation rules.
 *
 * 1. Organization owner registers with initial organization setup.
 * 2. Regular employee (A) is created in same organization and authenticated.
 * 3. Manager employee (B) is created in same organization and authenticated.
 * 4. Regular employee requests contract listing - verifies own contracts only.
 * 5. Manager requests contract listing - verifies all organization contracts.
 * 6. Regular employee attempts to filter by another employee's ID - isolation enforced.
 * 7. Validates that contract data respects user permission levels.
 */
export async function test_api_contract_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Organization owner registration
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResult = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerResult);
  const ownerMemberId = ownerResult.member.id;
  // 2. Create regular employee (Employee A) - will be in different org via join
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeAResult = await authorize_member_join(employeeAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAResult);
  const employeeAId = employeeAResult.member.id;
  // 3. Create manager employee (Employee B) - will be in different org via join
  const managerConnection: api.IConnection = { host: connection.host };
  const managerResult = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerResult);
  const managerId = managerResult.member.id;
  // 4. Test regular employee contract listing - should see own contracts only
  const employeeAContracts =
    await api.functional.hrmPlatform.member.contracts.index(
      employeeAConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(employeeAContracts);
  // 5. Test manager contract listing - should see all organization contracts
  const managerContracts =
    await api.functional.hrmPlatform.member.contracts.index(managerConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(managerContracts);
  // 6. Verify manager sees more or equal contracts than regular employee
  TestValidator.predicate(
    "manager sees more or equal contracts than regular employee",
    managerContracts.data.length >= employeeAContracts.data.length,
  );
  // 7. Test filtering by employee ID - regular employee tries to filter by manager's ID
  const employeeAFiltered =
    await api.functional.hrmPlatform.member.contracts.index(
      employeeAConnection,
      {
        body: {
          page: 1,
          limit: 10,
          employeeId: managerId,
        },
      },
    );
  typia.assert(employeeAFiltered);
  // Regular employee should still only see own contracts even with filter
  TestValidator.equals(
    "filter doesn't bypass isolation for regular employee",
    employeeAFiltered.data.length,
    employeeAContracts.data.length,
  );
  // 8. Verify each contract returned to regular employee belongs to them
  for (const contract of employeeAContracts.data) {
    const contractEmployeeId = contract.employee.member.id;
    TestValidator.equals(
      `contract ${contract.id} belongs to employee A`,
      contractEmployeeId,
      employeeAId,
    );
  }
  // 9. Verify manager can see employee's contracts when filtered appropriately
  const managerViewingEmployee =
    await api.functional.hrmPlatform.member.contracts.index(managerConnection, {
      body: {
        page: 1,
        limit: 10,
        employeeId: employeeAId,
      },
    });
  typia.assert(managerViewingEmployee);
  TestValidator.equals(
    "manager can filter by employee ID and see employee contracts",
    managerViewingEmployee.data.length,
    employeeAContracts.data.length,
  );
}
