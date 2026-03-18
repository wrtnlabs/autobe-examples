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

export async function test_api_contract_create_ends_previous_active_contract(
  connection: api.IConnection,
): Promise<void> {
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(join);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: join.token.access,
  };
  const t1 = RandomGenerator.date(new Date(), 0);
  t1.setUTCDate(t1.getUTCDate() - 10);
  const t2 = RandomGenerator.date(new Date(), 0);
  t2.setUTCDate(t2.getUTCDate() - 5);
  const status = "active";
  const pay_amount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const first =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection,
      {
        body: {
          contract_number: `CN1-${RandomGenerator.alphabets(10)}`,
          contract_title: RandomGenerator.name(),
          pay_amount,
          pay_currency: "USD",
          pay_frequency: "monthly",
          work_term_start_date: t1.toISOString(),
          work_term_end_date: null,
          notes: null,
          status,
        } satisfies IErpHrmTimeTrackingContract.ICreate,
      },
    );
  typia.assert(first);
  const second =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection,
      {
        body: {
          contract_number: `CN2-${RandomGenerator.alphabets(10)}`,
          contract_title: RandomGenerator.name(),
          pay_amount,
          pay_currency: "USD",
          pay_frequency: "monthly",
          work_term_start_date: t2.toISOString(),
          work_term_end_date: null,
          notes: null,
          status,
        } satisfies IErpHrmTimeTrackingContract.ICreate,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "second workTermStartDate matches T2",
    second.workTermStartDate,
    t2.toISOString(),
  );
  TestValidator.equals("second deletedAt is null", second.deletedAt, null);
}
