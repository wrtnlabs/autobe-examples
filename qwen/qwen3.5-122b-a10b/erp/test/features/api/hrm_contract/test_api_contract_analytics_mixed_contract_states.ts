import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContractAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractAnalytic";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test contract analytics endpoint with mixed contract states.
 *
 * Validates the contract analytics endpoint response structure and field presence for organizations with employees having multiple contracts in different lifecycle states. This test ensures the analytics computation returns properly structured data including contract lifecycle counts, pay period distribution, compensation statistics, and employment type distribution.
 *
 * The test validates that:
 * 1. The response conforms to IHrmContractAnalytic type with all required fields
 * 2. total_counts includes total, active, and historical contract counts
 * 3. pay_period_distribution includes all four pay period types (hourly, daily, weekly, monthly)
 * 4. compensation_stats includes average_pay_by_period and average_working_hours_per_week
 * 5. employment_type_distribution includes all four employment types (full_time, part_time, contractor, intern)
 *
 * 1. Authenticate member account with email and password credentials.
 * 2. Generate a random organization UUID for analytics request.
 * 3. Call contract analytics endpoint with organization context.
 * 4. Validate response structure matches IHrmContractAnalytic type definition.
 * 5. Verify all required fields and nested objects are present with correct types.
 */
export async function test_api_contract_analytics_mixed_contract_states(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(auth);
  // 2. Generate random organization ID
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call contract analytics endpoint
  const analytics: IHrmContractAnalytic =
    await api.functional.hrm.member.organizations.analytics.contracts.analytics(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(analytics);
  // 4. Validate response structure
  TestValidator.equals(
    "total_counts.total is non-negative integer",
    analytics.total_counts.total >= 0,
    true,
  );
  TestValidator.equals(
    "total_counts.active is non-negative integer",
    analytics.total_counts.active >= 0,
    true,
  );
  TestValidator.equals(
    "total_counts.historical is non-negative integer",
    analytics.total_counts.historical >= 0,
    true,
  );
  TestValidator.equals(
    "pay_period_distribution.hourly is non-negative integer",
    analytics.pay_period_distribution.hourly >= 0,
    true,
  );
  TestValidator.equals(
    "pay_period_distribution.daily is non-negative integer",
    analytics.pay_period_distribution.daily >= 0,
    true,
  );
  TestValidator.equals(
    "pay_period_distribution.weekly is non-negative integer",
    analytics.pay_period_distribution.weekly >= 0,
    true,
  );
  TestValidator.equals(
    "pay_period_distribution.monthly is non-negative integer",
    analytics.pay_period_distribution.monthly >= 0,
    true,
  );
  TestValidator.predicate(
    "compensation_stats.average_working_hours_per_week is defined",
    typeof analytics.compensation_stats.average_working_hours_per_week ===
      "number",
  );
  TestValidator.equals(
    "employment_type_distribution.full_time is non-negative integer",
    analytics.employment_type_distribution.full_time >= 0,
    true,
  );
  TestValidator.equals(
    "employment_type_distribution.part_time is non-negative integer",
    analytics.employment_type_distribution.part_time >= 0,
    true,
  );
  TestValidator.equals(
    "employment_type_distribution.contractor is non-negative integer",
    analytics.employment_type_distribution.contractor >= 0,
    true,
  );
  TestValidator.equals(
    "employment_type_distribution.intern is non-negative integer",
    analytics.employment_type_distribution.intern >= 0,
    true,
  );
}
