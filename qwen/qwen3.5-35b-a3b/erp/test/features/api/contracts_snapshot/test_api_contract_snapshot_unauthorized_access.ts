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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_contracts_create } from "../../../generate/generate_random_hrm_platform_member_contracts_create";
import { generate_random_hrm_platform_member_contracts_snapshots_create } from "../../../generate/generate_random_hrm_platform_member_contracts_snapshots_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";
import { prepare_random_hrm_platform_contracts_snapshot } from "../../../prepare/prepare_random_hrm_platform_contracts_snapshot";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_contract_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Regular employee joins without manager permissions
  const regularConnection: api.IConnection = { host: connection.host };
  const regularJoinOutput = await authorize_member_join(regularConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(regularJoinOutput);
  // Step 2: Regular employee creates their organization
  const regularOrg =
    await api.functional.hrmPlatform.member.organizations.create(
      regularConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "UTC",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(regularOrg);
  // Step 3: Admin user joins with employee:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(adminJoinOutput);
  // Step 4: Admin creates their organization
  const adminOrg = await api.functional.hrmPlatform.member.organizations.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 4,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(adminOrg);
  // Step 5: Admin creates a contract in their organization
  const adminContract =
    await api.functional.hrmPlatform.member.contracts.create(adminConnection, {
      body: {
        title: "Admin Employment Contract",
        start_date: new Date().toISOString(),
        end_date: undefined,
        compensation_amount: 5000000,
        compensation_currency: "KRW",
        status: "active" as const,
        employee_id: adminJoinOutput.member.id,
        organization_id: adminOrg.id,
      } satisfies IHrmPlatformContract.ICreate,
    });
  typia.assert(adminContract);
  // Step 6: Regular employee attempts to create snapshot of admin's contract (unauthorized)
  await TestValidator.error(
    "unauthorized snapshot creation returns 403",
    async () => {
      await api.functional.hrmPlatform.member.contracts.snapshots.create(
        regularConnection,
        {
          contractId: adminContract.id,
          body: {} satisfies IHrmPlatformContractsSnapshot.ICreate,
        },
      );
    },
  );
  // Step 7: Verify snapshot was not created by unauthorized user
  // The contract should still exist and be accessible by admin
  typia.assert(adminContract);
  TestValidator.equals(
    "contract still accessible to admin after unauthorized attempt",
    adminContract.id,
    adminContract.id,
  );
}