import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAnnouncement";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the announcements query endpoint behavior when no announcements match the specified filter criteria.
 *
 * This test validates that the announcements API correctly handles empty result sets
 * when applying various filter combinations that exclude all existing announcements.
 * It verifies proper pagination metadata and response structure for empty results.
 */
export async function test_api_admin_announcements_empty_results_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  // 2. Test with status filter for 'retracted' (likely no retracted announcements)
  const retractedFilter =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          status: "retracted",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(retractedFilter);
  // 3. Test with future date range filter (no scheduled announcements in far future)
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year in future
  const futureDateFilter =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          startDate: futureDate,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(futureDateFilter);
  // 4. Test with unique search term that won't match anything
  const uniqueSearchTerm = typia.random<string & tags.MinLength<20>>();
  const searchFilter =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          search: uniqueSearchTerm,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(searchFilter);
  // 5. Test with multiple restrictive filters combined
  const combinedFilter =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          status: "retracted",
          targetAudience: "community",
          deliveryStatus: "failed",
          search: uniqueSearchTerm,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 6. Verify all responses have correct empty result structure
  TestValidator.equals(
    "retracted filter - empty data array",
    retractedFilter.data,
    [],
  );
  TestValidator.equals(
    "retracted filter - records count is 0",
    retractedFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "retracted filter - pages count is 0",
    retractedFilter.pagination.pages,
    0,
  );
  TestValidator.equals(
    "retracted filter - current page is 1",
    retractedFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "retracted filter - limit is 20",
    retractedFilter.pagination.limit,
    20,
  );
  TestValidator.equals(
    "future date filter - empty data array",
    futureDateFilter.data,
    [],
  );
  TestValidator.equals(
    "future date filter - records count is 0",
    futureDateFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date filter - pages count is 0",
    futureDateFilter.pagination.pages,
    0,
  );
  TestValidator.equals(
    "search filter - empty data array",
    searchFilter.data,
    [],
  );
  TestValidator.equals(
    "search filter - records count is 0",
    searchFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "search filter - pages count is 0",
    searchFilter.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined filter - empty data array",
    combinedFilter.data,
    [],
  );
  TestValidator.equals(
    "combined filter - records count is 0",
    combinedFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filter - pages count is 0",
    combinedFilter.pagination.pages,
    0,
  );
}
