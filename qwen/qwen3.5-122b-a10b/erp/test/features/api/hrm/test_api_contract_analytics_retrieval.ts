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
 * Test contract analytics retrieval for HRM organization.
 *
 * Validates that an authenticated member can successfully retrieve contract analytics for their organization. The endpoint returns aggregated statistics including total contract counts (active vs historical), pay period distribution, average pay rates by period, average working hours per week, and employment type distribution.
 *
 * The test verifies the response structure matches IHrmContractAnalytic schema with all required fields properly populated and typed. Analytics are scoped to the organization specified in the organizationId path parameter.
 *
 * 1. Authenticate as a new member using authorize_member_join utility function.
 * 2. Generate a valid organizationId UUID for the analytics request.
 * 3. Call GET /hrm/member/organizations/{organizationId}/analytics/contracts endpoint.
 * 4. Validate response structure with typia.assert() for complete type validation.
 */
export async function test_api_contract_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(auth);
  // 2. Generate organizationId for analytics request
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call contract analytics endpoint
  const analytics: IHrmContractAnalytic =
    await api.functional.hrm.member.organizations.analytics.contracts.analytics(
      memberConnection,
      { organizationId },
    );
  // 4. Validate response structure with typia.assert()
  typia.assert(analytics);
}
