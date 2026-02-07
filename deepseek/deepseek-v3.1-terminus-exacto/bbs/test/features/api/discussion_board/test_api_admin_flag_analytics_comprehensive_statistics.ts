import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the flag analytics endpoint basic functionality and pagination.
 * Since content flag creation endpoints are not available, this test focuses
 * on validating the analytics endpoint's basic response structure and pagination
 * metadata without relying on actual flag data in the database.
 */
export async function test_api_admin_flag_analytics_comprehensive_statistics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
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
  // 2. Test analytics endpoint with basic pagination
  const analyticsResponse =
    await api.functional.discussionBoard.admin.analytics.flags.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    analyticsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    analyticsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    analyticsResponse.pagination.pages >= 0,
  );
  // 4. Test different pagination parameters
  const secondPageResponse =
    await api.functional.discussionBoard.admin.analytics.flags.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // 5. Validate pagination metadata consistency
  TestValidator.equals(
    "page 2 should have current page 2",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 should have limit 5",
    secondPageResponse.pagination.limit,
    5,
  );
}
