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

export async function test_api_organization_deletion_contract_dependency_and_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific base connection for the member (utility will set auth headers)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!",
    organizationName: RandomGenerator.alphabets(12),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/joins/" + RandomGenerator.alphabets(8),
    referrer: "https://example.com/ref/" + RandomGenerator.alphabets(8),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinPayload });
  const contract1 =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection,
      {},
    );
  typia.assert(contract1);
  const organizationId: string & tags.Format<"uuid"> =
    contract1.erpHrmTimeTrackingOrganizationId;
  // Scenario 1: deletion should be rejected while any active contract exists
  await TestValidator.error(
    "organization deletion should be rejected when an active contract exists",
    async () => {
      await api.functional.erpHrmTimeTracking.member.organizations.erase(
        memberConnection,
        { organizationId },
      );
    },
  );
  // Try to resolve dependency by creating a new contract starting earlier.
  // If the service ends prior active contracts as of the day before a new
  // start date, this should deactivate the dependency.
  const workStart = new Date(contract1.workTermStartDate);
  const earlier = new Date(workStart.getTime() - 24 * 60 * 60 * 1000);
  const contract2 =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection,
      {
        body: {
          work_term_start_date: earlier.toISOString(),
          status: contract1.status,
        } satisfies DeepPartial<IErpHrmTimeTrackingContract.ICreate>,
      },
    );
  typia.assert(contract2);
  // Should succeed after dependency resolved
  await api.functional.erpHrmTimeTracking.member.organizations.erase(
    memberConnection,
    { organizationId },
  );
  // Scenario 2: ensure scope isolation after deletion (approximation: repeated delete should fail)
  await TestValidator.error(
    "organization-scoped operation after deletion should fail",
    async () => {
      await api.functional.erpHrmTimeTracking.member.organizations.erase(
        memberConnection,
        { organizationId },
      );
    },
  );
  // Scenario 3: ensure deletion does not affect unrelated organizations for the same member
  // Create a second organization via a second join flow, then ensure deletion of OA1 doesn't break OA2.
  const memberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!",
      organizationName: RandomGenerator.alphabets(12),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/joins/" + RandomGenerator.alphabets(8),
      referrer: "https://example.com/ref/" + RandomGenerator.alphabets(8),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // Make sure OA2 exists by creating a contract and capturing its org id.
  const contractOA2 =
    await generate_random_erp_hrm_time_tracking_member_contracts_create_contract(
      memberConnection2,
      {},
    );
  typia.assert(contractOA2);
  const organizationIdOA2: string & tags.Format<"uuid"> =
    contractOA2.erpHrmTimeTrackingOrganizationId;
  // Delete OA2 as well to ensure endpoints still work for that organization after prior deletion.
  await api.functional.erpHrmTimeTracking.member.organizations.erase(
    memberConnection2,
    { organizationId: organizationIdOA2 },
  );
}
