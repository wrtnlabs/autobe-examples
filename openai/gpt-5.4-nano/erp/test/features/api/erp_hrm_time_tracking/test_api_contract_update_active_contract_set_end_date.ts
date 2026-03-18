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

export async function test_api_contract_update_active_contract_set_end_date(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "P@ssw0rd!";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuth);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers ??= {};
  userConnection.headers.Authorization = memberAuth.token.access;
  // 2) Create an employee’s initial active contract with work_term_end_date = null.
  const contractStart = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const contract: IErpHrmTimeTrackingContract =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      userConnection,
      {
        body: {
          contract_number: `C-${RandomGenerator.alphabets(10)}`,
          contract_title: RandomGenerator.name(),
          pay_amount: 1000,
          pay_currency: "USD",
          pay_frequency: "monthly",
          work_term_start_date: contractStart,
          work_term_end_date: null,
          notes: null,
          status: "active",
        },
      },
    );
  typia.assert(contract);
  TestValidator.equals(
    "initial contract end date is null",
    contract.workTermEndDate,
    null,
  );
  // 3) PUT update to set work_term_end_date.
  const updatedNotes = RandomGenerator.paragraph({ sentences: 1 });
  const newEnd = new Date(
    new Date(contract.workTermStartDate).getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const updated =
    await api.functional.erpHrmTimeTracking.member.contracts.update(
      userConnection,
      {
        contractId: contract.id,
        body: {
          work_term_end_date: newEnd,
          notes: updatedNotes,
        } satisfies IErpHrmTimeTrackingContract.IUpdate,
      },
    );
  typia.assert(updated);
  // 4) Validate response fields.
  TestValidator.equals("contract id unchanged", updated.id, contract.id);
  TestValidator.equals(
    "work term end date set",
    updated.workTermEndDate,
    newEnd,
  );
  TestValidator.equals("notes updated", updated.notes, updatedNotes);
  // 6) Validate timestamps.
  TestValidator.notEquals(
    "updated timestamp changed",
    updated.updatedAt,
    contract.updatedAt,
  );
  TestValidator.equals(
    "created timestamp unchanged",
    updated.createdAt,
    contract.createdAt,
  );
  // 7) Optional follow-up: create a later new contract for the same employee.
  const laterStart = new Date(
    new Date(newEnd).getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const nextContract =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      userConnection,
      {
        body: {
          contract_number: `C-${RandomGenerator.alphabets(10)}`,
          contract_title: RandomGenerator.name(),
          pay_amount: 2000,
          pay_currency: "USD",
          pay_frequency: "monthly",
          work_term_start_date: laterStart,
          work_term_end_date: null,
          notes: null,
          status: "active",
        },
      },
    );
  typia.assert(nextContract);
  TestValidator.equals(
    "next contract end date is null",
    nextContract.workTermEndDate,
    null,
  );
  // Do not attempt to re-edit the now-ended first contract.
}
