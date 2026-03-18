import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_contracts_create_contract } from "../../../generate/generate_random_erp_hrm_time_tracking_member_contracts_create_contract";
import { prepare_random_erp_hrm_time_tracking_contract } from "../../../prepare/prepare_random_erp_hrm_time_tracking_contract";

export async function test_api_contract_update_contract_number_unique_per_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd-" + RandomGenerator.alphabets(10);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const pay_currency = "USD";
  const pay_frequency = "monthly";
  // 2) Create active contract C1: ongoing (work_term_end_date = null)
  const workTermStartC1 = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 1,
  ).toISOString() as string & tags.Format<"date-time">;
  const contract1 =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection,
      {
        body: {
          contract_number: `C1-${RandomGenerator.alphabets(10)}`,
          contract_title: RandomGenerator.paragraph({ sentences: 1 }),
          pay_amount: typia.random<number>(),
          pay_currency,
          pay_frequency,
          work_term_start_date: workTermStartC1,
          work_term_end_date: null,
          notes: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
        } satisfies IErpHrmTimeTrackingContract.ICreate,
      },
    );
  typia.assert(contract1);
  // 3) Create historical contract C2: ended (work_term_end_date != null)
  //    Use an earlier start date so C1 remains the active ongoing contract.
  const workTermStartC2 = RandomGenerator.date(
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
    1000 * 60 * 60 * 24 * 20,
  ).toISOString() as string & tags.Format<"date-time">;
  const workTermEndC2 = RandomGenerator.date(
    new Date(workTermStartC2),
    1000 * 60 * 60 * 24 * 10,
  ).toISOString() as string & tags.Format<"date-time">;
  const contract2 =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection,
      {
        body: {
          contract_number: `C2-${RandomGenerator.alphabets(10)}`,
          contract_title: RandomGenerator.paragraph({ sentences: 1 }),
          pay_amount: typia.random<number>(),
          pay_currency,
          pay_frequency,
          work_term_start_date: workTermStartC2,
          work_term_end_date: workTermEndC2,
          notes: RandomGenerator.paragraph({ sentences: 1 }),
          status: "ended",
        } satisfies IErpHrmTimeTrackingContract.ICreate,
      },
    );
  typia.assert(contract2);
  const activeBefore = contract1;
  const activeBeforeUpdatedAt = contract1.updatedAt;
  const duplicateContractNumber = contract2.contractNumber;
  // 4) Attempt to update active contract C1's contract_number to duplicate C2's number.
  await TestValidator.error(
    "reject duplicate contract_number per employee",
    async () => {
      await api.functional.erpHrmTimeTracking.member.contracts.update(
        memberConnection,
        {
          contractId: activeBefore.id,
          body: {
            contract_number: duplicateContractNumber,
          } satisfies IErpHrmTimeTrackingContract.IUpdate,
        },
      );
    },
  );
  // 6) Validate state: active contract remains unchanged.
  const activeAfter =
    await api.functional.erpHrmTimeTracking.member.contracts.update(
      memberConnection,
      {
        contractId: activeBefore.id,
        body: {} satisfies IErpHrmTimeTrackingContract.IUpdate,
      },
    );
  typia.assert(activeAfter);
  TestValidator.equals(
    "active contract_number unchanged",
    activeAfter.contractNumber,
    activeBefore.contractNumber,
  );
  TestValidator.equals(
    "active updatedAt unchanged",
    activeAfter.updatedAt,
    activeBeforeUpdatedAt,
  );
  // 7) Validate historical record immutability.
  const historicalAfter =
    await api.functional.erpHrmTimeTracking.member.contracts.update(
      memberConnection,
      {
        contractId: contract2.id,
        body: {} satisfies IErpHrmTimeTrackingContract.IUpdate,
      },
    );
  typia.assert(historicalAfter);
  TestValidator.equals(
    "historical contract_number unchanged",
    historicalAfter.contractNumber,
    contract2.contractNumber,
  );
}
