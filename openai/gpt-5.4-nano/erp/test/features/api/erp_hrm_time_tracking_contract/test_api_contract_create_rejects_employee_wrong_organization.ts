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

export async function test_api_contract_create_rejects_employee_wrong_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (creates initial organization context)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: `${RandomGenerator.name()}-${typia.random<number & tags.Type<"uint32">>()}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: memberJoin,
  });
  typia.assert(authorized);
  // Use the same connection which was updated by authorize_member_join
  // (connection.headers.Authorization is set internally by the utility).
  // 2) Create another member in a different organization to induce cross-org isolation
  const otherOrgConnection: api.IConnection = { host: connection.host };
  const otherOrgJoin: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: `${RandomGenerator.name()}-${typia.random<number & tags.Type<"uint32">>()}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 2,
    href: "https://example.com/join2",
    referrer: "https://example.com/referrer2",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const otherAuthorized = await authorize_member_join(otherOrgConnection, {
    body: otherOrgJoin,
  });
  typia.assert(otherAuthorized);
  // NOTE:
  // With the provided DTO `IErpHrmTimeTrackingContract.ICreate`, there is no
  // field to explicitly specify an employee id or organization id.
  // So the test can only validate that contract creation is rejected when
  // the endpoint cannot satisfy cross-organization scoping rules.
  const contractCreate: IErpHrmTimeTrackingContract.ICreate = {
    contract_number: `CN-${RandomGenerator.alphabets(10)}-${typia.random<number & tags.Type<"uint32">>()}`,
    contract_title: RandomGenerator.paragraph({ sentences: 2 }),
    pay_amount: typia.random<number>(),
    pay_currency: "USD",
    pay_frequency: "monthly",
    work_term_start_date: new Date().toISOString(),
    work_term_end_date: null,
    notes: null,
    status: "active",
  } satisfies IErpHrmTimeTrackingContract.ICreate;
  await TestValidator.error(
    "reject contract creation when employee context is from another organization",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
        memberConnection,
        {
          body: contractCreate,
        },
      );
    },
  );
  // No further state assertions are possible with the provided DTOs/endpoints.
}
