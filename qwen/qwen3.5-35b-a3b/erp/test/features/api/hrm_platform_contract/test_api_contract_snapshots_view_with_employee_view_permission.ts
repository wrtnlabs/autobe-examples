import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractsSnapshot";
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

export async function test_api_contract_snapshots_view_with_employee_view_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as manager user (creates organization)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // Note: IHrmPlatformMember.ISummary doesn't include organization field
  // Using generated organization ID for testing purposes (valid in simulation mode)
  const managerOrganizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Join as another member (test user without employee:view permission initially)
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberAuth = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(otherMemberAuth);
  // 3. Create contract for the other member
  const contract = await generate_random_hrm_platform_member_contracts_create(
    otherMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        start_date: new Date().toISOString(),
        status: "active" as const,
        employee_id: otherMemberAuth.member.id,
        organization_id: managerOrganizationId,
      },
    },
  );
  typia.assert(contract);
  // 4. Manager retrieves snapshots for the other employee's contract
  // Create a fresh connection with manager's token
  const managerViewConnection: api.IConnection = { host: connection.host };
  managerViewConnection.headers = {
    Authorization: managerAuth.token.access,
  };
  const snapshots =
    await api.functional.hrmPlatform.member.contracts.snapshots.index(
      managerViewConnection,
      {
        contractId: contract.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshots);
  // 5. Validate snapshot retrieval
  TestValidator.equals(
    "snapshots count when employee:view permission exists",
    snapshots.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot contract number matches contract id",
    snapshots.data[0].contract_number,
    contract.id,
  );
  TestValidator.predicate(
    "snapshot has valid start date",
    snapshots.data[0].start_date !== undefined,
  );
  TestValidator.predicate(
    "snapshot has compensation data",
    snapshots.data[0].compensation_amount !== null,
  );
  TestValidator.equals(
    "pagination records count",
    snapshots.pagination.records,
    1,
  );
}
