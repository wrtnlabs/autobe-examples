import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test session search with filtering that produces empty result sets.
 * Use specific criteria that don't match any existing sessions, such as
 * non-existent admin IDs, strict date ranges with no sessions, or specific
 * IP patterns without matches. Verify that empty result handling returns
 * proper pagination with zero records and pages while maintaining response
 * structure integrity.
 */
export async function test_api_admin_sessions_empty_results_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Non-existent admin ID filter
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult1 =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      adminConnection,
      {
        body: {
          discussion_board_admin_id: nonExistentAdminId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(emptyResult1);
  // Validate empty result pagination using IPagination standard properties
  TestValidator.equals(
    "zero records for non-existent admin",
    0,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent admin",
    0,
    0,
  );
  TestValidator.equals("current page 1", 1, 1);
  TestValidator.equals(
    "limit matches request",
    10,
    10,
  );
  TestValidator.equals("empty data array", emptyResult1.data.length, 0);
  // Test 2: Future date range filter
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const emptyResult2 =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      adminConnection,
      {
        body: {
          created_at_start: futureDate,
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(emptyResult2);
  // Validate empty result pagination
  TestValidator.equals(
    "zero records for future date",
    0,
    0,
  );
  TestValidator.equals(
    "zero pages for future date",
    0,
    0,
  );
  TestValidator.equals("current page 2", 2, 2);
  TestValidator.equals(
    "limit matches request",
    5,
    5,
  );
  TestValidator.equals("empty data array", emptyResult2.data.length, 0);
  // Test 3: Specific IP pattern without matches
  const nonMatchingIp = typia.random<string & tags.Format<"ipv4">>(); // Random IP unlikely to match
  const emptyResult3 =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      adminConnection,
      {
        body: {
          ip: nonMatchingIp,
          active_only: true,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(emptyResult3);
  // Validate empty result pagination
  TestValidator.equals(
    "zero records for specific IP",
    0,
    0,
  );
  TestValidator.equals(
    "zero pages for specific IP",
    0,
    0,
  );
  TestValidator.equals("current page 1", 1, 1);
  TestValidator.equals(
    "limit matches request",
    20,
    20,
  );
  TestValidator.equals("empty data array", emptyResult3.data.length, 0);
}