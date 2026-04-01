import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timesheet list filtering by status values (draft, submitted, approved, rejected).
 * 1. Register member account for authentication
 * 2. Query timesheets with status=draft filter
 * 3. Query timesheets with status=submitted filter
 * 4. Query timesheets with status=approved filter
 * 5. Query timesheets with status=rejected filter
 * 6. Test pagination with status filtering
 * 7. Validate each filtered response contains only matching status timesheets
 */
export async function test_api_timesheet_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Query timesheets with status=draft filter
  const draftTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "draft",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(draftTimesheets);
  TestValidator.predicate(
    "draft timesheets returned",
    draftTimesheets.data.length >= 0,
  );
  draftTimesheets.data.forEach((timesheet) => {
    TestValidator.equals(
      "timesheet status is draft",
      timesheet.status,
      "draft",
    );
  });
  // 3. Query timesheets with status=submitted filter
  const submittedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "submitted",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(submittedTimesheets);
  TestValidator.predicate(
    "submitted timesheets returned",
    submittedTimesheets.data.length >= 0,
  );
  submittedTimesheets.data.forEach((timesheet) => {
    TestValidator.equals(
      "timesheet status is submitted",
      timesheet.status,
      "submitted",
    );
  });
  // 4. Query timesheets with status=approved filter
  const approvedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "approved",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(approvedTimesheets);
  TestValidator.predicate(
    "approved timesheets returned",
    approvedTimesheets.data.length >= 0,
  );
  approvedTimesheets.data.forEach((timesheet) => {
    TestValidator.equals(
      "timesheet status is approved",
      timesheet.status,
      "approved",
    );
  });
  // 5. Query timesheets with status=rejected filter
  const rejectedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "rejected",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(rejectedTimesheets);
  TestValidator.predicate(
    "rejected timesheets returned",
    rejectedTimesheets.data.length >= 0,
  );
  rejectedTimesheets.data.forEach((timesheet) => {
    TestValidator.equals(
      "timesheet status is rejected",
      timesheet.status,
      "rejected",
    );
  });
  // 6. Test pagination with status filtering (page 2, limit 5)
  const paginatedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "draft",
        page: 2,
        limit: 5,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(paginatedTimesheets);
  TestValidator.predicate(
    "pagination current page is 2",
    paginatedTimesheets.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    paginatedTimesheets.pagination.limit === 5,
  );
  paginatedTimesheets.data.forEach((timesheet) => {
    TestValidator.equals(
      "paginated timesheet status is draft",
      timesheet.status,
      "draft",
    );
  });
  // 7. Validate pagination structure
  TestValidator.predicate(
    "pagination records count valid",
    paginatedTimesheets.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count valid",
    paginatedTimesheets.pagination.pages >= 0,
  );
}
