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

export async function test_api_contract_create_first_active_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a new member (join establishes org context)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.alphabets(10),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Actor-specific connection using the join-established auth headers
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorized.token.access };
  // 2) Create first contract as open-ended (end date null, notes null)
  const workTermStart = new Date().toISOString();
  const contractNumber = `CN-${RandomGenerator.alphaNumeric(10)}`;
  const contractTitle = RandomGenerator.paragraph({ sentences: 2 });
  const createInput = {
    contract_number: contractNumber,
    contract_title: contractTitle,
    pay_amount: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    pay_currency: "USD",
    pay_frequency: "monthly",
    work_term_start_date: workTermStart,
    work_term_end_date: null,
    notes: null,
    status: "active",
  } satisfies IErpHrmTimeTrackingContract.ICreate;
  const created =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      userConnection,
      {
        body: createInput,
      },
    );
  typia.assert(created);
  // 3) Validate response fields and null-handling
  TestValidator.equals(
    "workTermStartDate equals request",
    created.workTermStartDate,
    workTermStart,
  );
  TestValidator.equals(
    "workTermEndDate is null",
    created.workTermEndDate,
    null,
  );
  TestValidator.equals("deletedAt is null", created.deletedAt, null);
  // 4) Business-rule sanity: created contract should be current/active
  TestValidator.predicate(
    "current contract has no end date",
    () => created.workTermEndDate === null,
  );
  TestValidator.equals(
    "status indicates active contract",
    created.status,
    "active",
  );
}
