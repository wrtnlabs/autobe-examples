import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test analytics endpoint behavior when no sections match filter criteria.
 * Super administrator specifies extreme filter parameters that no sections satisfy
 * (e.g., future date range, unreasonably high metric thresholds). Verify the system
 * returns empty data array with proper pagination metadata showing zero records
 * and pages. Ensure the response structure remains consistent even with no matching
 * data, maintaining valid pagination information and empty data array format.
 */
export async function test_api_analytics_sections_no_matching_data(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
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
  // Generate extreme filter parameters that guarantee no matches
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // One year in future
  const extremeThreshold = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000000>
  >();
  const filterParams = {
    start_date: futureDate,
    end_date: futureDate,
    min_view_count: extremeThreshold,
    min_article_count: extremeThreshold,
    min_comment_count: extremeThreshold,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSectionStatistic.IRequest;
  // Call analytics endpoint with extreme filters
  const response =
    await api.functional.discussionBoard.superAdmin.analytics.sections.index(
      superAdminConnection,
      {
        body: filterParams,
      },
    );
  typia.assert(response);
  // Validate empty data array
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // Validate pagination metadata for zero records
  TestValidator.equals(
    "records should be zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pages should be zero", response.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    response.pagination.limit,
    10,
  );
}
