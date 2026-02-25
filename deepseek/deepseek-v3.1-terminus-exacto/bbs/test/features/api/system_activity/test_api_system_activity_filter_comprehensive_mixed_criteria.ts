import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_activity_filter_comprehensive_mixed_criteria(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin
  await authorize_admin_join(adminConnection, {});
  // Prepare date range: last 30 days
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const searchBody: IDiscussionBoardSystemActivity.IRequest = {
    activity_type: "login",
    target_entity_type: "user",
    success_status: true,
    created_at_from: fromDate.toISOString(),
    created_at_to: toDate.toISOString(),
    search: "user session",
    page: 1,
    limit: 20,
  };
  const page =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      { body: searchBody },
    );
  typia.assert(page);
  // Validate pagination metadata - navigate through the nested pagination structure
  TestValidator.predicate(
    "pagination exists",
    () => page.pagination !== undefined,
  );
  // Navigate through the nested pagination structure to reach the actual IPage.IPagination
  const sectionPagination = page.pagination;
  TestValidator.predicate(
    "section pagination exists",
    () => sectionPagination.pagination !== undefined,
  );
  const adminPromotionPagination = sectionPagination.pagination;
  TestValidator.predicate(
    "admin promotion pagination exists",
    () => adminPromotionPagination.pagination !== undefined,
  );
  const adminDistributionPagination = adminPromotionPagination.pagination;
  TestValidator.predicate(
    "admin distribution pagination exists",
    () => adminDistributionPagination.pagination !== undefined,
  );
  // Finally reach the actual IPage.IPagination
  const actualPagination = adminDistributionPagination.pagination;
  TestValidator.equals("current page", actualPagination.current, 1);
  TestValidator.equals("limit", actualPagination.limit, 20);
  TestValidator.predicate(
    "records non-negative",
    actualPagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", actualPagination.pages >= 0);
  if (actualPagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      actualPagination.pages ===
        Math.ceil(actualPagination.records / actualPagination.limit),
    );
  } else {
    TestValidator.equals("empty pages", actualPagination.pages, 0);
  }
  // Validate each activity in data array
  for (const activity of page.data) {
    TestValidator.equals(
      "activity_type matches filter",
      activity.activity_type,
      "login",
    );
    if (
      activity.target_entity_type !== null &&
      activity.target_entity_type !== undefined
    ) {
      TestValidator.equals(
        "target_entity_type matches filter",
        activity.target_entity_type,
        "user",
      );
    }
    TestValidator.equals("success_status true", activity.success_status, true);
    TestValidator.predicate(
      "created_at within range",
      activity.created_at >= fromDate.toISOString() &&
        activity.created_at <= toDate.toISOString(),
    );
    TestValidator.predicate("has actor identity", () => {
      return (
        activity.user !== null ||
        activity.admin !== null ||
        activity.superAdmin !== null
      );
    });
  }
  // Test empty result scenario with impossible date range
  const impossibleBody: IDiscussionBoardSystemActivity.IRequest = {
    created_at_from: new Date("2100-01-01").toISOString(),
    created_at_to: new Date("2100-12-31").toISOString(),
    page: 1,
    limit: 20,
  };
  const emptyPage =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      { body: impossibleBody },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty data array length", emptyPage.data.length, 0);
}
