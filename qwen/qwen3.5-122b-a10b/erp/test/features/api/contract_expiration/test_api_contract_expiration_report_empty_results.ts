import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContractExpirationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractExpirationSummary";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmContractExpirationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractExpirationSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test contract expiration report endpoint returns empty results when no contracts are expiring.
 *
 * Validates the contract expiration report endpoint's behavior when querying an organization with no upcoming contract renewals within the specified date range. This ensures the endpoint correctly handles edge cases and returns proper empty result structure rather than throwing errors.
 *
 * The test verifies:
 * 1. Request with valid organization ID that contains no expiring contracts
 * 2. Response returns empty data array with zero total records
 * 3. Pagination metadata shows current page 1, records count of 0, and pages count of 0
 * 4. HTTP status code 200 (successful retrieval with no results)
 * 5. Response structure remains consistent with successful case (pagination object present)
 * 6. Business rule validation: endpoint correctly handles edge case without throwing errors
 *
 * 1. Register member account with randomized credentials.
 * 2. Create authenticated connection for API calls.
 * 3. Call contract expiration report search with random organization UUID.
 * 4. Validate response structure and empty results.
 */
export async function test_api_contract_expiration_report_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Call contract expiration report with random organization ID
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const report =
    await api.functional.hrm.member.organizations.reports.contract_expirations.search(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(report);
  // 3. Validate empty results structure
  TestValidator.equals("data array empty", report.data.length, 0);
  TestValidator.equals(
    "pagination records count",
    report.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", report.pagination.pages, 0);
  TestValidator.equals("pagination current page", report.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    report.pagination.limit > 0,
  );
}
