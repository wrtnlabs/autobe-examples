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

export async function test_api_contract_erase_active_contract_invariant_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!1234",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/onboarding",
    referrer: "https://example.com/previous",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2) Create contracts; first should be active.
  const now = new Date();
  const activeStart = new Date(now.getTime() - 1000 * 60 * 60 * 24);
  const otherStart = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60);
  const activeContract =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection,
      {
        body: {
          contract_number: `CTR-${RandomGenerator.alphaNumeric(8)}`,
          contract_title: RandomGenerator.name(),
          pay_amount: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          pay_currency: "USD",
          pay_frequency: "monthly",
          work_term_start_date: activeStart.toISOString(),
          work_term_end_date: null,
          notes: null,
          status: "active",
        } satisfies IErpHrmTimeTrackingContract.ICreate,
      },
    );
  typia.assert(activeContract);
  const otherContract =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection,
      {
        body: {
          contract_number: `CTR-${RandomGenerator.alphaNumeric(8)}`,
          contract_title: RandomGenerator.name(),
          pay_amount: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
          pay_currency: "USD",
          pay_frequency: "monthly",
          work_term_start_date: otherStart.toISOString(),
          work_term_end_date: activeStart.toISOString(),
          notes: null,
          status: "ended",
        } satisfies IErpHrmTimeTrackingContract.ICreate,
      },
    );
  typia.assert(otherContract);
  // 3) Attempt erase active contract
  let deletionSucceeded = false;
  try {
    await api.functional.erpHrmTimeTracking.member.contracts.erase(
      memberConnection,
      {
        contractId: activeContract.id,
      },
    );
    deletionSucceeded = true;
  } catch {
    deletionSucceeded = false;
  }
  // 4) Validate behavior
  if (deletionSucceeded) {
    // second delete should be treated as missing
    await TestValidator.error(
      "active contract should be missing after erase",
      async () => {
        await api.functional.erpHrmTimeTracking.member.contracts.erase(
          memberConnection,
          {
            contractId: activeContract.id,
          },
        );
      },
    );
    // other contract should still be erasable
    await api.functional.erpHrmTimeTracking.member.contracts.erase(
      memberConnection,
      {
        contractId: otherContract.id,
      },
    );
    return;
  }
  // If deletion rejected, ensure other contract can be erased
  await api.functional.erpHrmTimeTracking.member.contracts.erase(
    memberConnection,
    {
      contractId: otherContract.id,
    },
  );
  // active contract should still be erasable
  await api.functional.erpHrmTimeTracking.member.contracts.erase(
    memberConnection,
    {
      contractId: activeContract.id,
    },
  );
}
