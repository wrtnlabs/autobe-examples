import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test moderation efficiency analytics with specific time range filtering.
 */
export async function test_api_admin_analytics_moderation_efficiency_time_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate time range for filtering (last 7 days)
  const currentDate = new Date();
  const sevenDaysAgo = new Date(
    currentDate.getTime() - 7 * 24 * 60 * 60 * 1000,
  );
  // 3. Call moderation efficiency analytics with time range filters
  const analyticsResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection,
      {
        body: {
          performed_at_from: sevenDaysAgo.toISOString(),
          performed_at_to: currentDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "response has pagination",
    typeof analyticsResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    () => analyticsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    () => analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => analyticsResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => analyticsResponse.pagination.limit >= 0,
  );
  // 5. Validate data array structure
  TestValidator.equals(
    "data is array",
    Array.isArray(analyticsResponse.data),
    true,
  );
}
