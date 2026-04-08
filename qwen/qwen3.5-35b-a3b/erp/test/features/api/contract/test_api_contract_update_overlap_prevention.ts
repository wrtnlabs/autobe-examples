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

export async function test_api_contract_update_overlap_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial organization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Extract member and organization details from session
  const memberId = authorized.member.id;
  // Get organization from the session if available
  const organizationId =
    authorized.sessions?.[0]?.organization?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 3. Calculate dates for contracts
  const now = new Date();
  const startDate1 = now.toISOString();
  const endDate1 = new Date(
    now.getTime() + 90 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 90 days
  const startDate2 = new Date(
    now.getTime() + 60 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 60 days (overlaps with contract1)
  const endDate2 = new Date(
    now.getTime() + 120 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 120 days
  // 4. Create first contract (active, ends at day 90)
  const contract1 = await generate_random_hrm_platform_member_contracts_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.name(),
        start_date: startDate1,
        end_date: endDate1,
        compensation_amount: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0>
        >(),
        compensation_currency: "USD",
        status: "active",
        notes: RandomGenerator.paragraph(),
        employee_id: memberId,
        organization_id: organizationId,
      } satisfies IHrmPlatformContract.ICreate,
    },
  );
  typia.assert(contract1);
  // 5. Create second contract that overlaps with first (starts at day 60, ends at day 120)
  // According to ICreate DTO description, this should automatically end contract1
  const contract2 = await generate_random_hrm_platform_member_contracts_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.name(),
        start_date: startDate2,
        end_date: endDate2,
        compensation_amount: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0>
        >(),
        compensation_currency: "USD",
        status: "active",
        notes: RandomGenerator.paragraph(),
        employee_id: memberId,
        organization_id: organizationId,
      } satisfies IHrmPlatformContract.ICreate,
    },
  );
  typia.assert(contract2);
  // 6. Verify contract1 was automatically ended by contract2 creation
  TestValidator.equals(
    "contract1 should be ended after contract2 creation",
    contract1.status,
    "ended",
  );
  // 7. Try to update contract1 to make it active again with end_date that overlaps contract2
  // This should fail with 409 Conflict because contract2 is still active
  const overlappingEndDate = new Date(
    now.getTime() + 150 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 150 days
  await TestValidator.httpError(
    "update contract1 to overlap should return 409 Conflict",
    409,
    async () => {
      await api.functional.hrmPlatform.member.contracts.update(
        adminConnection,
        {
          contractId: contract1.id,
          body: {
            end_date: overlappingEndDate,
          } satisfies IHrmPlatformContract.IUpdate,
        },
      );
    },
  );
  // 8. Verify contract1 status remains "ended"
  const updatedContract1 =
    await api.functional.hrmPlatform.member.contracts.update(adminConnection, {
      contractId: contract1.id,
      body: {} satisfies IHrmPlatformContract.IUpdate,
    });
  typia.assert(updatedContract1);
  TestValidator.equals(
    "contract1 status should remain ended",
    updatedContract1.status,
    "ended",
  );
  TestValidator.equals(
    "contract1 end_date should be unchanged",
    updatedContract1.end_date,
    contract1.end_date,
  );
  // 9. Verify contract2 remains active
  TestValidator.equals(
    "contract2 should remain active",
    contract2.status,
    "active",
  );
  // 10. Test that extending contract2's end_date without overlap is allowed
  const nonOverlappingEndDate = new Date(
    now.getTime() + 200 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 200 days
  const updatedContract2 =
    await api.functional.hrmPlatform.member.contracts.update(adminConnection, {
      contractId: contract2.id,
      body: {
        end_date: nonOverlappingEndDate,
      } satisfies IHrmPlatformContract.IUpdate,
    });
  typia.assert(updatedContract2);
  TestValidator.equals(
    "contract2 end_date should be extended",
    updatedContract2.end_date,
    nonOverlappingEndDate,
  );
  TestValidator.equals(
    "contract2 status should remain active",
    updatedContract2.status,
    "active",
  );
}
