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

export async function test_api_contract_update_end_date_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(memberAuth);
  // 2. Get organization ID from member's session
  const organizationId = memberAuth.sessions?.[0]?.organization?.id ?? "";
  const employeeId = memberAuth.member.id;
  // 3. Create initial active contract (no end date)
  const activeContract =
    await api.functional.hrmPlatform.member.contracts.create(memberConnection, {
      body: {
        title: "Initial Employment Contract",
        start_date: new Date().toISOString() as string &
          tags.Format<"date-time">,
        status: "active" as const,
        employee_id: employeeId,
        organization_id: organizationId,
      } satisfies IHrmPlatformContract.ICreate,
    });
  typia.assert(activeContract);
  // 4. Verify initial contract is active with no end date
  TestValidator.equals(
    "initial status is active",
    activeContract.status,
    "active",
  );
  TestValidator.equals(
    "initial end_date is null",
    activeContract.end_date,
    null,
  );
  // 5. Update contract with past end_date to end the contract
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // yesterday
  const updatedContract =
    await api.functional.hrmPlatform.member.contracts.update(memberConnection, {
      contractId: activeContract.id,
      body: {
        end_date: pastDate.toISOString() as string & tags.Format<"date-time">,
      } satisfies IHrmPlatformContract.IUpdate,
    });
  typia.assert(updatedContract);
  // 6. Verify contract status changed to 'ended'
  TestValidator.equals(
    "status changed to ended",
    updatedContract.status,
    "ended",
  );
  // 7. Verify end_date is set correctly
  TestValidator.equals(
    "end_date set correctly",
    updatedContract.end_date,
    pastDate.toISOString(),
  );
  // 8. Verify updated_at timestamp reflects the update time
  const updateTimestamp = new Date(updatedContract.updated_at);
  const now = new Date();
  const timeDiff = now.getTime() - updateTimestamp.getTime();
  TestValidator.predicate(
    "updated_at is recent (within last minute)",
    timeDiff >= 0 && timeDiff <= 60000,
  );
  // 9. Verify subsequent update attempt fails with 409 conflict
  await TestValidator.error(
    "subsequent update fails with 409 on ended contract",
    async () => {
      await api.functional.hrmPlatform.member.contracts.update(
        memberConnection,
        {
          contractId: updatedContract.id,
          body: {
            title: "Updated Title",
          } satisfies IHrmPlatformContract.IUpdate,
        },
      );
    },
  );
}
