import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";

export async function test_api_activity_log_search_filtered_by_action_user_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Member A context
  const memberAConnection: api.IConnection = { host: connection.host };
  const password = "Password123!";
  const joinA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/href" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
      ip: null,
    },
  });
  typia.assert(joinA);
  const memberAId = joinA.id;
  // Trigger at least one activity log event for member A within a known time window
  const now = new Date();
  const occurredAtFrom = new Date(now.getTime() - 5 * 60000).toISOString();
  const occurredAtTo = new Date(now.getTime() + 5 * 60000).toISOString();
  await generate_random_erp_hrm_time_tracking_member_timelogs_create(
    memberAConnection,
    {},
  );
  const initialPage =
    await api.functional.erpHrmTimeTracking.member.activityLogs.search(
      memberAConnection,
      {
        body: {
          performedByMemberId: memberAId,
          occurredAtFrom,
          occurredAtTo,
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(initialPage);
  TestValidator.predicate(
    "member A activity logs exist in time window",
    () => initialPage.data.length > 0,
  );
  const actionTypes = Array.from(
    new Set(initialPage.data.map((e) => e.action_type)),
  );
  const actionType1 = actionTypes[0]!;
  const actionType2 = actionTypes.length > 1 ? actionTypes[1]! : undefined;
  const page1 =
    await api.functional.erpHrmTimeTracking.member.activityLogs.search(
      memberAConnection,
      {
        body: {
          actionType: actionType1,
          performedByMemberId: memberAId,
          occurredAtFrom,
          occurredAtTo,
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(page1);
  const organizationId = page1.data[0]?.organization_id;
  TestValidator.predicate(
    "page1 has at least one entry to validate organization",
    () => organizationId !== undefined,
  );
  for (const entry of page1.data) {
    TestValidator.equals(
      "organization_id matches member context",
      entry.organization_id,
      organizationId,
    );
    TestValidator.equals(
      "performed_by_member_id matches filter",
      entry.performed_by_member_id,
      memberAId,
    );
    TestValidator.equals(
      "action_type matches filter",
      entry.action_type,
      actionType1,
    );
    TestValidator.predicate(
      "occurred_at within range",
      () =>
        entry.occurred_at >= occurredAtFrom &&
        entry.occurred_at <= occurredAtTo,
    );
  }
  for (let i = 1; i < page1.data.length; ++i) {
    TestValidator.predicate(
      "occurred_at is DESC ordered",
      () => page1.data[i - 1].occurred_at >= page1.data[i].occurred_at,
    );
  }
  // Edge coverage: different actionType should not include actionType1
  if (actionType2 !== undefined && actionType2 !== actionType1) {
    const page2 =
      await api.functional.erpHrmTimeTracking.member.activityLogs.search(
        memberAConnection,
        {
          body: {
            actionType: actionType2,
            performedByMemberId: memberAId,
            occurredAtFrom,
            occurredAtTo,
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "different actionType filter excludes actionType1",
      () => page2.data.every((e) => e.action_type !== actionType1),
    );
  }
  // Different member isolation check
  const memberBConnection: api.IConnection = { host: connection.host };
  const joinB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/href" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
      ip: null,
    },
  });
  typia.assert(joinB);
  const page3 =
    await api.functional.erpHrmTimeTracking.member.activityLogs.search(
      memberBConnection,
      {
        body: {
          actionType: actionType1,
          performedByMemberId: joinA.id,
          occurredAtFrom,
          occurredAtTo,
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(page3);
  // Expect no entries because member B is in a different organization and/or actor scope.
  TestValidator.equals(
    "member B query for member A performed events should return empty",
    page3.data.length,
    0,
  );
}
