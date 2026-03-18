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
 * Test that an authenticated employee can successfully retrieve their own timesheets.
 * The employee should be able to view timesheets they created across all statuses
 * (draft, submitted, approved, rejected). Validate that the response contains only
 * the requesting employee's timesheets, includes proper pagination metadata, and
 * returns essential fields like id, status, week boundaries, totalHours, and review
 * information.
 */
export async function test_api_timesheet_list_own_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Join/authenticate as member to establish organization context
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(member);
  // Retrieve own timesheets with pagination parameters
  const response = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata consistency
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", response.pagination.limit, 20);
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // Validate that all returned timesheets belong to the authenticated member
  for (const timesheet of response.data) {
    TestValidator.equals(
      "timesheet belongs to authenticated member",
      timesheet.organizationMember.user.id,
      member.id,
    );
  }
}
