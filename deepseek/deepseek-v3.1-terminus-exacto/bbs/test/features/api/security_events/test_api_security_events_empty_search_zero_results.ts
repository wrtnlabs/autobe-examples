import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test security events search scenarios that should return zero results, validating proper handling of no matching data.
 * Tests with filters that should not match any existing records (specific event types that don't exist,
 * date ranges outside available data, search terms with no matches). Verifies that the system returns
 * empty paginated results with correct pagination metadata (total records 0) rather than errors.
 * Also tests the default unfiltered search to verify it returns all available security events with proper pagination.
 */
export async function test_api_security_events_empty_search_zero_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Test 1: Default unfiltered search - should return all events
  const defaultSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(defaultSearch);
  // Test 2: Search with non-existent event type - should return zero results
  const nonExistentEventType =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          event_type: "non_existent_event_type_that_should_not_exist",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(nonExistentEventType);
  TestValidator.equals(
    "non-existent event type returns empty data",
    nonExistentEventType.data,
    [],
  );
  // 导航到最内层的 pagination
  const nonExistentPagination =
    nonExistentEventType.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "non-existent event type has zero records",
    nonExistentPagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent event type has zero pages",
    nonExistentPagination.pages,
    0,
  );
  // Test 3: Search with future date range - should return zero results
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const futureSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          created_at_start: futureDate,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(futureSearch);
  TestValidator.equals(
    "future date range returns empty data",
    futureSearch.data,
    [],
  );
  const futurePagination =
    futureSearch.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "future date range has zero records",
    futurePagination.records,
    0,
  );
  TestValidator.equals(
    "future date range has zero pages",
    futurePagination.pages,
    0,
  );
  // Test 4: Search with non-matching search term - should return zero results
  const nonMatchingSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          search:
            "xyz123_non_matching_search_term_that_should_not_exist_987abc",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  TestValidator.equals(
    "non-matching search term returns empty data",
    nonMatchingSearch.data,
    [],
  );
  const nonMatchingPagination =
    nonMatchingSearch.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "non-matching search term has zero records",
    nonMatchingPagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching search term has zero pages",
    nonMatchingPagination.pages,
    0,
  );
}
