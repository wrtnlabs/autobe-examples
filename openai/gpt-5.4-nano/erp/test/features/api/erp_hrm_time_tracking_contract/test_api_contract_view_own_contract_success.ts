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

export async function test_api_contract_view_own_contract_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register & authorize as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!12345",
      organizationName: RandomGenerator.name(2),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) Create contract for same member in selected org context
  const createdContract =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection,
      {
        body: {
          contract_number: `CT-${RandomGenerator.alphabets(10)}`,
          contract_title: RandomGenerator.paragraph({ sentences: 2 }),
          pay_amount: typia.random<number>(),
          pay_currency: "USD",
          pay_frequency: "monthly",
          work_term_start_date: new Date().toISOString(),
          work_term_end_date: null,
          notes: RandomGenerator.paragraph({ sentences: 1 }),
          status: "active",
        } satisfies DeepPartial<IErpHrmTimeTrackingContract.ICreate>,
      },
    );
  typia.assert(createdContract);
  // 3) View own contract by id (use authorized actor-specific connection)
  const fetched = await api.functional.erpHrmTimeTracking.member.contracts.at(
    memberConnection,
    {
      contractId: createdContract.id,
    },
  );
  typia.assert(fetched);
  // 4) Validations - payload identity and fields
  TestValidator.equals(
    "organization id matches",
    fetched.erpHrmTimeTrackingOrganizationId,
    createdContract.erpHrmTimeTrackingOrganizationId,
  );
  TestValidator.equals(
    "employee id matches",
    fetched.erpHrmTimeTrackingEmployeeId,
    createdContract.erpHrmTimeTrackingEmployeeId,
  );
  TestValidator.equals(
    "contractNumber matches",
    fetched.contractNumber,
    createdContract.contractNumber,
  );
  TestValidator.equals(
    "contractTitle matches",
    fetched.contractTitle,
    createdContract.contractTitle,
  );
  TestValidator.equals(
    "payAmount matches",
    fetched.payAmount,
    createdContract.payAmount,
  );
  TestValidator.equals(
    "payCurrency matches",
    fetched.payCurrency,
    createdContract.payCurrency,
  );
  TestValidator.equals(
    "payFrequency matches",
    fetched.payFrequency,
    createdContract.payFrequency,
  );
  TestValidator.equals(
    "workTermStartDate matches",
    fetched.workTermStartDate,
    createdContract.workTermStartDate,
  );
  TestValidator.equals(
    "workTermEndDate matches (ongoing/null allowed)",
    fetched.workTermEndDate,
    createdContract.workTermEndDate,
  );
  TestValidator.equals(
    "deletedAt matches",
    fetched.deletedAt,
    createdContract.deletedAt,
  );
}
