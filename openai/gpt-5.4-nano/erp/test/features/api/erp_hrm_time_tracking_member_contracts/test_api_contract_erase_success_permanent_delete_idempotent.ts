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

export async function test_api_contract_erase_success_permanent_delete_idempotent(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!234",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    },
  });

  const contract = await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
    memberConnection,
    typia.assert<{
      body?: {
        contract_number?: string | undefined;
        contract_title?: string | undefined;
        pay_amount?: number | undefined;
        pay_currency?: string | undefined;
        pay_frequency?: string | undefined;
        work_term_start_date?: (string & tags.Format<"date-time">) | undefined;
        work_term_end_date?: (string & tags.Format<"date-time">) | null | undefined;
        notes?: string | null | undefined;
        status?: string | undefined;
      } | undefined;
    }>(await prepare_random_erp_hrm_time_tracking_contract()),
  );
  typia.assert(contract);
  await api.functional.erpHrmTimeTracking.member.contracts.erase(memberConnection, {
    contractId: contract.id,
  });
  await TestValidator.error(
    "second delete should fail as missing",
    async () => {
      await api.functional.erpHrmTimeTracking.member.contracts.erase(memberConnection, {
        contractId: contract.id,
      });
    },
  );
}
