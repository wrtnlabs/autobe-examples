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

export async function test_api_contract_erase_tenant_isolation_cross_org_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join (creates initial organization context for A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!23456",
      organizationName: `org-${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/href",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAAuthorized);

  // 2) Member B join (creates initial organization context for B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!23456",
      organizationName: `org-${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/href",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberBAuthorized);

  const contractCreateArg = typia.assert<
    Parameters<typeof generate_random_erp_hrm_time_tracking_member_contracts_create_contract>[1]
  >({} as unknown);

  // 3) Create Contract A under Member A's organization
  const contractA =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberAConnection,
      contractCreateArg,
    );
  typia.assert(contractA);

  // 4) Create Contract B under Member B's organization
  const contractB =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberBConnection,
      contractCreateArg,
    );
  typia.assert(contractB);

  // 5) Attempt cross-org erase: Member A tries to delete Contract B (should fail)
  await TestValidator.httpError(
    "cross-org delete should be denied or treated as not found",
    [403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.member.contracts.erase(
        memberAConnection,
        {
          contractId: contractB.id,
        },
      );
    },
  );

  // 6) Contract A in org A must remain intact; delete it should succeed
  await api.functional.erpHrmTimeTracking.member.contracts.erase(
    memberAConnection,
    { contractId: contractA.id },
  );

  // 7) Contract B must still be deletable under org B
  await api.functional.erpHrmTimeTracking.member.contracts.erase(
    memberBConnection,
    { contractId: contractB.id },
  );
}
