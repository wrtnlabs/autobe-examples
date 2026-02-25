import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test edge cases in ban duration listing pagination including boundary conditions,
 * empty result sets, and maximum page limits.
 */
export async function test_api_ban_duration_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Empty result set with default pagination
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_ban_duration_search_term",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  // Test 2: Edge case limit values - minimum limit (1)
  const minLimitResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.predicate(
    "min limit data length valid",
    minLimitResult.data.length <= 1,
  );
  // Test 3: Edge case limit values - maximum limit (100)
  const maxLimitResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "max limit data length valid",
    maxLimitResult.data.length <= 100,
  );
  // Test 4: Page request beyond total pages
  const beyondPageResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.predicate(
    "beyond page data empty",
    beyondPageResult.data.length === 0,
  );
  // Test 5: Multiple page navigation (if there are multiple pages)
  const firstPage =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(firstPage);
  // Test 6: Filtering with duration range
  const durationRangeResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          duration_hours: {
            min: 24,
            max: 168,
          },
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(durationRangeResult);
  // Test 7: Permanent ban filter
  const permanentFilterResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          is_permanent: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(permanentFilterResult);
  // Test 8: Temporary ban filter
  const temporaryFilterResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          is_permanent: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(temporaryFilterResult);
  // Test 9: Combined search and pagination
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "hour",
          duration_hours: {
            min: 1,
            max: 100,
          },
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(combinedResult);
}
