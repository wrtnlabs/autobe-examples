import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_timesheet_metrics_pagination_and_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(member);
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // 2. Create organization
  const org = await api.functional.hrmTracker.member.organizations.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
        description: null,
        logo_image_uri: null,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org);
  // 3. Create multiple timesheets in different statuses using real UUIDs
  const weekStart = new Date("2026-03-17T00:00:00.000Z").toISOString();
  const weekEnd = new Date("2026-03-23T23:59:59.999Z").toISOString();
  // Create 3 draft timesheets
  const draftTimesheets = await Promise.all(
    ArrayUtil.repeat(3, async (i) => {
      const draft = await api.functional.hrmTracker.member.timesheets.create(
        memberConnection,
        {
          body: {
            timesheet_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHrmTrackerTimesheet.ISubmit,
        },
      );
      typia.assert(draft);
      return draft;
    }),
  );
  // Create 2 submitted timesheets
  const submittedTimesheets = await Promise.all(
    ArrayUtil.repeat(2, async (i) => {
      const submitted =
        await api.functional.hrmTracker.member.timesheets.create(
          memberConnection,
          {
            body: {
              timesheet_id: typia.random<string & tags.Format<"uuid">>(),
            } satisfies IHrmTrackerTimesheet.ISubmit,
          },
        );
      typia.assert(submitted);
      return submitted;
    }),
  );
  // Create 1 approved timesheet
  const approvedTimesheets = await Promise.all(
    ArrayUtil.repeat(1, async (i) => {
      const approved = await api.functional.hrmTracker.member.timesheets.create(
        memberConnection,
        {
          body: {
            timesheet_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHrmTrackerTimesheet.ISubmit,
        },
      );
      typia.assert(approved);
      return approved;
    }),
  );
  // 4. Test status filtering and pagination
  // Test 1: Filter by 'draft' status with pagination
  const draftResponse =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      memberConnection,
      {
        body: {
          status: "draft",
          page: 1,
          limit: 2,
        } satisfies IHrmTrackerTimesheet.IRequest,
      },
    );
  typia.assert(draftResponse);
  TestValidator.equals("draft count", draftResponse.pagination.records, 3);
  TestValidator.equals("draft page 1 limit 2", draftResponse.data.length, 2);
  // Test 2: Filter by 'submitted' status
  const submittedResponse =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      memberConnection,
      {
        body: {
          status: "submitted",
          page: 1,
          limit: 10,
        } satisfies IHrmTrackerTimesheet.IRequest,
      },
    );
  typia.assert(submittedResponse);
  TestValidator.equals(
    "submitted count",
    submittedResponse.pagination.records,
    2,
  );
  // Test 3: Filter by 'approved' status
  const approvedResponse =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      memberConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IHrmTrackerTimesheet.IRequest,
      },
    );
  typia.assert(approvedResponse);
  TestValidator.equals(
    "approved count",
    approvedResponse.pagination.records,
    1,
  );
  // Test 4: Filter by 'rejected' status (empty)
  const rejectedResponse =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      memberConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IHrmTrackerTimesheet.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  TestValidator.equals(
    "rejected count",
    rejectedResponse.pagination.records,
    0,
  );
  TestValidator.equals("rejected data empty", rejectedResponse.data.length, 0);
  // Test 5: Pagination with limit=2, page=2 for draft
  const page2Response =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      memberConnection,
      {
        body: {
          status: "draft",
          page: 2,
          limit: 2,
        } satisfies IHrmTrackerTimesheet.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("draft pages", page2Response.pagination.pages, 2);
  TestValidator.equals("draft page 2 limit 2", page2Response.data.length, 1);
  // Test 6: Pagination metadata validation
  TestValidator.predicate(
    "pagination current",
    page2Response.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit",
    page2Response.pagination.limit === 2,
  );
  TestValidator.predicate(
    "pagination records",
    page2Response.pagination.records === 3,
  );
}
