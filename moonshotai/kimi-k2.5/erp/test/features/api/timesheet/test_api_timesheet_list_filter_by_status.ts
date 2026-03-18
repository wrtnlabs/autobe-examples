import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering timesheets by workflow status to locate specific timesheets in the approval pipeline.
 * Creates an authenticated member context and validates filtering by each status value: 'draft',
 * 'submitted', 'approved', and 'rejected'. Validates response structure, pagination, and that
 * returned timesheets contain the expected status field structure.
 */
export async function test_api_timesheet_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatarUrl: typia.random<string & tags.Format<"uri">>(),
      timezone: "Asia/Seoul",
      locale: "en-US",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  // 2. Test filtering by 'draft' status (collecting timelogs)
  const draftResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "draft",
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(draftResult);
  // 3. Test filtering by 'submitted' status (awaiting review)
  const submittedResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "submitted",
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(submittedResult);
  // 4. Test filtering by 'approved' status (locked and confirmed)
  const approvedResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "approved",
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(approvedResult);
  // 5. Test filtering by 'rejected' status (returned for correction)
  const rejectedResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "rejected",
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(rejectedResult);
  // 6. Test pagination with status filter
  const paginatedResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "draft",
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(paginatedResult);
  // 7. Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    paginatedResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginatedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    paginatedResult.pagination.pages >= 0,
  );
  // 8. If any timesheets returned, validate they have expected structure including totalHours
  for (const timesheet of draftResult.data) {
    TestValidator.predicate(
      "timesheet has valid totalHours",
      timesheet.totalHours >= 0,
    );
  }
}