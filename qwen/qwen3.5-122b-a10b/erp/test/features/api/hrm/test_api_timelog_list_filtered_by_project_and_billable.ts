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

export async function test_api_timelog_list_filtered_by_project_and_billable(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test timelog list filtering by project and billable status.
   *
   * Validates that the timelog list endpoint accepts and processes multiple filter criteria including billable status and project IDs. The test verifies that the API correctly handles various filter combinations and returns properly structured paginated responses.
   *
   * 1. Member registers and authenticates to access organization-scoped features.
   * 2. Test timelog list with billable=true filter - validates API accepts billable filter.
   * 3. Test timelog list with billable=false filter - validates API accepts non-billable filter.
   * 4. Test timelog list with project_ids filter - validates API accepts project filtering.
   * 5. Test timelog list with combined project and billable filters - validates combined filtering.
   * 6. Test timelog list without filters (baseline) - validates unfiltered response structure.
   * 7. Validate all responses have correct pagination and data array structure.
   */
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test timelog list with billable=true filter
  const billableFiltered = await api.functional.hrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: true,
        page: 1,
        limit: 10,
      } satisfies IHrmTimelog.IRequest,
    },
  );
  typia.assert(billableFiltered);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current is valid",
    billableFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    billableFiltered.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    billableFiltered.pagination.records >= 0,
  );
  // 3. Test timelog list with billable=false filter
  const nonBillableFiltered = await api.functional.hrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        billable: false,
        page: 1,
        limit: 10,
      } satisfies IHrmTimelog.IRequest,
    },
  );
  typia.assert(nonBillableFiltered);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current is valid",
    nonBillableFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    nonBillableFiltered.pagination.limit > 0,
  );
  // 4. Test timelog list with project filter
  const projectIds: (string & tags.Format<"uuid">)[] = [];
  if (memberAuth.organizations && memberAuth.organizations.length > 0) {
    // Generate a random project ID for filtering
    const randomProjectId = typia.random<string & tags.Format<"uuid">>();
    projectIds.push(randomProjectId);
  }
  const projectFiltered = await api.functional.hrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        project_ids: projectIds,
        page: 1,
        limit: 10,
      } satisfies IHrmTimelog.IRequest,
    },
  );
  typia.assert(projectFiltered);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current is valid",
    projectFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    projectFiltered.pagination.limit > 0,
  );
  // 5. Test timelog list with combined project and billable filters
  const combinedFiltered = await api.functional.hrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        project_ids: projectIds,
        billable: true,
        page: 1,
        limit: 10,
      } satisfies IHrmTimelog.IRequest,
    },
  );
  typia.assert(combinedFiltered);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current is valid",
    combinedFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    combinedFiltered.pagination.limit > 0,
  );
  // 6. Test timelog list without filters (baseline)
  const unfiltered = await api.functional.hrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTimelog.IRequest,
    },
  );
  typia.assert(unfiltered);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current is valid",
    unfiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    unfiltered.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    unfiltered.pagination.records >= 0,
  );
  // 7. Validate response structure
  TestValidator.predicate(
    "response has data array",
    Array.isArray(unfiltered.data),
  );
  TestValidator.predicate(
    "pagination object exists",
    unfiltered.pagination !== null && unfiltered.pagination !== undefined,
  );
}
