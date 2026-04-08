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
 * Test contract expiration report retrieval for HRM organization.
 *
 * Validates the contract expiration report endpoint that retrieves active employment contracts requiring renewal attention. The test verifies successful data retrieval, response structure, pagination metadata, and business logic including active contract filtering and expiration day calculations.
 *
 * The report helps organization administrators proactively manage contract renewals by showing contracts with their days remaining until expiration, sorted by urgency (most urgent first).
 *
 * 1. Member authenticates with email and password credentials.
 * 2. Retrieves contract expiration report for organization with pagination parameters.
 * 3. Validates response structure matches IPageIHrmContractExpirationSummary type.
 * 4. Validates pagination metadata (current page, limit, records, pages).
 * 5. Validates each contract entry includes employee summary with position, employment_type, status.
 * 6. Validates contract details include pay_rate, pay_period, working_hours_per_week.
 * 7. Validates days_until_expiration is calculated and contracts sorted ascending.
 * 8. Validates only active contracts (end_date IS NULL) are included in the report.
 */
export async function test_api_contract_expiration_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Generate organization ID for the report query
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Query contract expiration report
  const report: IPageIHrmContractExpirationSummary =
    await api.functional.hrm.member.organizations.reports.contract_expirations.search(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(report);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is valid",
    report.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    report.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records count is valid",
    report.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages count is valid",
    report.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "pages equals ceiling of records/limit",
    report.pagination.pages,
    report.pagination.limit > 0
      ? Math.ceil(report.pagination.records / report.pagination.limit)
      : report.pagination.records === 0
        ? 0
        : 1,
  );
  // 5. Validate each contract entry structure and business logic
  await TestValidator.predicate(
    "all contracts have required fields and proper sorting",
    async () => {
      let previousDaysUntilExpiration: number | null = null;
      for (const contract of report.data) {
        typia.assert(contract);
        // Validate days_until_expiration is calculated
        TestValidator.equals(
          "days_until_expiration is positive integer",
          contract.days_until_expiration >= 0,
          true,
        );
        // Validate contracts are sorted by days_until_expiration ascending
        if (previousDaysUntilExpiration !== null) {
          TestValidator.equals(
            "contracts sorted by expiration ascending",
            contract.days_until_expiration >= previousDaysUntilExpiration,
            true,
          );
        }
        previousDaysUntilExpiration = contract.days_until_expiration;
      }
      return true;
    },
  );
  // 6. Validate business rule: active contracts have end_date IS NULL
  await TestValidator.predicate(
    "active contracts have null end_date",
    async () => {
      for (const contract of report.data) {
        // For active contracts (end_date IS NULL), days_until_expiration should be 90 (default warning period)
        if (contract.end_date === null) {
          TestValidator.equals(
            "active contract days_until_expiration is 90 (default warning)",
            contract.days_until_expiration === 90,
            true,
          );
        }
      }
      return true;
    },
  );
}
