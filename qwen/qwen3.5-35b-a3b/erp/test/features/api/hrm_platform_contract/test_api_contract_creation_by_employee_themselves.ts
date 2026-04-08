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

export async function test_api_contract_creation_by_employee_themselves(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (automatically creates organization)
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joined);
  // 2. Create contract for the member's organization
  // Use the utility function which handles employee creation internally
  const memberConnection: api.IConnection = { host: connection.host };
  const contract = await generate_random_hrm_platform_member_contracts_create(
    memberConnection,
    {
      body: {
        title: "Employment Contract",
        start_date: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_date: undefined,
        compensation_amount: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000000>
        >(),
        compensation_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        status: "active",
        notes:
          "Test contract for self-authorization scenario - employee creates their own contract",
      },
    },
  );
  typia.assert(contract);
  // 3. Validate contract creation
  TestValidator.equals("contract status", contract.status, "active");
  TestValidator.equals("contract title", contract.title, "Employment Contract");
  TestValidator.predicate(
    "compensation currency valid",
    contract.compensation_currency !== null,
  );
  TestValidator.predicate(
    "employee reference exists",
    contract.employee !== null,
  );
  TestValidator.equals(
    "organization matches",
    contract.organization.name,
    joined.member.display_name ?? "",
  );
  TestValidator.predicate(
    "has valid start date",
    new Date(contract.start_date) > new Date(),
  );
}