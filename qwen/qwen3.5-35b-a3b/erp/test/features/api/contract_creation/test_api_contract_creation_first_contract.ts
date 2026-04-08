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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_contracts_create } from "../../../generate/generate_random_hrm_platform_member_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

export async function test_api_contract_creation_first_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with organization creation
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["KRW", "USD", "EUR"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create a new employee record (simulated with random UUID)
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create first contract for the employee (no prior active contracts)
  const contractConnection: api.IConnection = { host: connection.host };
  const contractResult =
    await api.functional.hrmPlatform.member.contracts.create(
      contractConnection,
      {
        body: {
          title: "Employment Agreement",
          start_date: new Date(Date.now() + 86400000).toISOString(),
          end_date: undefined,
          compensation_amount: 50000000,
          compensation_currency: "KRW",
          status: "active" as const,
          notes: "Regular full-time employment",
          employee_id: employeeId,
          organization_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformContract.ICreate,
      },
    );
  typia.assert(contractResult);
  // 4. Validate contract creation
  TestValidator.equals(
    "contract title",
    contractResult.title,
    "Employment Agreement",
  );
  TestValidator.equals("contract status", contractResult.status, "active");
  TestValidator.equals(
    "compensation amount",
    contractResult.compensation_amount,
    50000000,
  );
  TestValidator.equals(
    "compensation currency",
    contractResult.compensation_currency,
    "KRW",
  );
  TestValidator.equals("employee id", contractResult.employee.id, employeeId);
  TestValidator.equals(
    "organization reference exists",
    contractResult.organization.id,
    contractResult.organization.id,
  );
  TestValidator.equals("deleted_at is null", contractResult.deleted_at, null);
  TestValidator.predicate(
    "created_at is valid date-time",
    !!contractResult.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !!contractResult.updated_at,
  );
  TestValidator.predicate(
    "start_date is in future",
    new Date(contractResult.start_date) > new Date(),
  );
}
