import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering comment rate limits by enforcement patterns.
 * This scenario validates that administrators can search for rate limits based on enforcement statistics,
 * such as those that have been recently triggered or have high enforcement counts.
 */
export async function test_api_admin_comment_rate_limits_filter_by_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test filtering by enforcement_action
  const enforcementActionFilter: IDiscussionBoardApiRateLimit.IRequest = {
    enforcement_action: "block",
    page: 1,
    limit: 20,
  };
  const actionResults =
    await api.functional.discussionBoard.admin.comment_rate_limits.index(
      adminConnection,
      { body: enforcementActionFilter },
    );
  typia.assert(actionResults);
  // 3. Test filtering by enforcement_count (high enforcement counts)
  const highEnforcementFilter: IDiscussionBoardApiRateLimit.IRequest = {
    enforcement_action: "throttle",
    page: 1,
    limit: 10,
  };
  const highEnforcementResults =
    await api.functional.discussionBoard.admin.comment_rate_limits.index(
      adminConnection,
      { body: highEnforcementFilter },
    );
  typia.assert(highEnforcementResults);
  // 4. Test filtering by enforced_at timestamps (recent enforcement)
  const recentEnforcementFilter: IDiscussionBoardApiRateLimit.IRequest = {
    updated_at_after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    page: 1,
    limit: 15,
  };
  const recentResults =
    await api.functional.discussionBoard.admin.comment_rate_limits.index(
      adminConnection,
      { body: recentEnforcementFilter },
    );
  typia.assert(recentResults);
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof actionResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    actionResults.pagination.current >= 0,
  );
  TestValidator.predicate("has limit", actionResults.pagination.limit > 0);
  TestValidator.predicate(
    "has records count",
    actionResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    actionResults.pagination.pages >= 0,
  );
  // 6. Validate data structure
  TestValidator.predicate("data is array", Array.isArray(actionResults.data));
}
