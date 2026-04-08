import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timelog list retrieval with date and project filtering capabilities.
 *
 * Validates the filtering functionality for organization-scoped timelog retrieval, ensuring that employees can filter time tracking entries by date range, project, and billable status. The test verifies that the filtering endpoint correctly accepts various filter combinations and returns properly structured paginated responses.
 *
 * Since timelog and project creation utilities are not available in this test environment, the test focuses on validating the API contract, filter parameter handling, and response structure rather than actual data filtering logic.
 *
 * 1. Member authenticates and obtains organization context
 * 2. Test date range filtering parameters (start_date and end_date)
 * 3. Test project_id filtering with UUID array
 * 4. Test billable status filtering (true/false)
 * 5. Test combined filtering (date + project + billable)
 * 6. Verify pagination metadata structure and fields
 * 7. Test empty date range edge case returns valid response
 * 8. Validate response type safety with typia.assert()
 */
export async function test_api_timelog_list_with_date_and_project_filters(
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
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // Get organization from auth response
  if (!auth.organizations || auth.organizations.length === 0) {
    throw new Error("No organizations available for testing");
  }
  const organizationId = auth.organizations[0].id;
  // 2. Test date range filtering
  const startDate = new Date("2024-01-15T00:00:00Z");
  const endDate = new Date("2024-01-20T23:59:59Z");
  const dateFiltered =
    await api.functional.hrm.member.organizations.timelogs.index(
      memberConnection,
      {
        organizationId,
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filter returns valid pagination",
    dateFiltered.pagination.current >= 1,
  );
  TestValidator.predicate(
    "date filter returns valid records count",
    dateFiltered.pagination.records >= 0,
  );
  // 3. Test project_id filtering with UUID array
  const randomProjectId = typia.random<string & tags.Format<"uuid">>();
  const projectFiltered =
    await api.functional.hrm.member.organizations.timelogs.index(
      memberConnection,
      {
        organizationId,
        body: {
          project_ids: [randomProjectId],
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(projectFiltered);
  TestValidator.predicate(
    "project filter returns valid pagination",
    projectFiltered.pagination.current >= 1,
  );
  // 4. Test billable status filtering (true)
  const billableTrueFiltered =
    await api.functional.hrm.member.organizations.timelogs.index(
      memberConnection,
      {
        organizationId,
        body: {
          billable: true,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(billableTrueFiltered);
  TestValidator.predicate(
    "billable true filter returns valid response",
    billableTrueFiltered.pagination.records >= 0,
  );
  // Test billable status filtering (false)
  const billableFalseFiltered =
    await api.functional.hrm.member.organizations.timelogs.index(
      memberConnection,
      {
        organizationId,
        body: {
          billable: false,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(billableFalseFiltered);
  TestValidator.predicate(
    "billable false filter returns valid response",
    billableFalseFiltered.pagination.records >= 0,
  );
  // 5. Test combined filtering (date + project + billable)
  const combinedFiltered =
    await api.functional.hrm.member.organizations.timelogs.index(
      memberConnection,
      {
        organizationId,
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          project_ids: [randomProjectId],
          billable: true,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.predicate(
    "combined filter returns valid pagination",
    combinedFiltered.pagination.current >= 1,
  );
  TestValidator.predicate(
    "combined filter returns valid records count",
    combinedFiltered.pagination.records >= 0,
  );
  // 6. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has current field",
    typeof combinedFiltered.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit field",
    typeof combinedFiltered.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records field",
    typeof combinedFiltered.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages field",
    typeof combinedFiltered.pagination.pages === "number",
  );
  // 7. Test empty date range edge case (far future date)
  const farFutureDate = new Date("2030-01-01T00:00:00Z");
  const emptyFiltered =
    await api.functional.hrm.member.organizations.timelogs.index(
      memberConnection,
      {
        organizationId,
        body: {
          start_date: farFutureDate.toISOString(),
          end_date: farFutureDate.toISOString(),
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(emptyFiltered);
  TestValidator.equals(
    "empty date range returns valid pagination",
    emptyFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "empty filter returns valid records count",
    emptyFiltered.pagination.records >= 0,
  );
  // 8. Test with pagination parameters
  const paginatedFiltered =
    await api.functional.hrm.member.organizations.timelogs.index(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(paginatedFiltered);
  TestValidator.equals(
    "pagination respects page parameter",
    paginatedFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination respects limit parameter",
    paginatedFiltered.pagination.limit === 10 ||
      paginatedFiltered.data.length <= 10,
  );
}
