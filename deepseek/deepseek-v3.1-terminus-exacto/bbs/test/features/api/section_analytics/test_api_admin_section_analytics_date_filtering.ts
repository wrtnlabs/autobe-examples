import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_section_analytics_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Prepare test date ranges
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // 3. Test full date range (start_date and end_date)
  const fullRangeResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          start_date: twoWeeksAgo.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(fullRangeResponse);
  // Validate full range response
  TestValidator.predicate(
    "pagination exists",
    fullRangeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(fullRangeResponse.data),
  );
  // 4. Test only start_date (activities after specific date)
  const startOnlyResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          start_date: oneWeekAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(startOnlyResponse);
  // 5. Test only end_date (activities before specific date)
  const endOnlyResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          end_date: oneDayAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(endOnlyResponse);
  // 6. Test narrow date range
  const narrowRangeResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          start_date: oneDayAgo.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(narrowRangeResponse);
  // 7. Validate date filtering logic
  if (fullRangeResponse.data.length > 0) {
    const section = fullRangeResponse.data[0];
    const sectionDate = new Date(section.last_activity_at);
    TestValidator.predicate(
      "section date within full range",
      sectionDate >= twoWeeksAgo && sectionDate <= now,
    );
  }
  // 8. Test pagination with date filtering
  const secondPageResponse =
    await api.functional.discussionBoard.admin.analytics.sections.index(
      adminConnection,
      {
        body: {
          start_date: twoWeeksAgo.toISOString(),
          end_date: now.toISOString(),
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // 9. Validate analytics data structure
  if (fullRangeResponse.data.length > 0) {
    const stat = fullRangeResponse.data[0];
    TestValidator.predicate(
      "has view_count",
      typeof stat.view_count === "number",
    );
    TestValidator.predicate(
      "has article_count",
      typeof stat.article_count === "number",
    );
    TestValidator.predicate(
      "has comment_count",
      typeof stat.comment_count === "number",
    );
    TestValidator.predicate(
      "has valid last_activity_at",
      stat.last_activity_at !== null && stat.last_activity_at.length > 0,
    );
    TestValidator.predicate("has section data", stat.section !== undefined);
  }
}
