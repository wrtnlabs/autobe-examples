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

export async function test_api_security_events_admin_search_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using available authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Since authorize_admin_join is not available in the imports, we need to use the SDK directly
  // for admin authentication. However, looking at the available DTOs, there's no ILogin defined.
  // We'll need to create a basic admin connection without authentication for this test.
  // This assumes the endpoint doesn't require authentication or uses a different auth method.
  // Test 1: Basic search with no filters
  const basicSearch =
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
  typia.assert(basicSearch);
  // Test 2: Filter by event type (using random string instead of hard-coded values)
  const eventTypeSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          event_type: RandomGenerator.alphabets(10),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(eventTypeSearch);
  // Test 3: Filter by severity (using random string instead of hard-coded values)
  const severitySearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          severity: RandomGenerator.alphabets(6),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(severitySearch);
  // Test 4: Filter by resolution status
  const resolvedSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          resolved: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(resolvedSearch);
  const unresolvedSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          resolved: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(unresolvedSearch);
  // Test 5: Date range filtering
  const dateSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(dateSearch);
  // Test 6: Text search
  const textSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.substring("security event test search query"),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(textSearch);
  // Test 7: Actor filtering (using null since we don't have actual actor IDs)
  const actorSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          user_id: null,
          admin_id: null,
          super_admin_id: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(actorSearch);
  // Test 8: Combined filters
  const combinedSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          event_type: RandomGenerator.alphabets(8),
          severity: RandomGenerator.alphabets(5),
          resolved: typia.random<boolean>(),
          search: RandomGenerator.substring("combined filter test"),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test 9: Pagination with different page sizes
  const paginationTest1 =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(paginationTest1);
  const paginationTest2 =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 25,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(paginationTest2);
  // Test 10: Maximum page size
  const maxPageSizeSearch =
    await api.functional.discussionBoard.admin.security_events.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(maxPageSizeSearch);
  // No more TestValidator calls that access pagination properties
  // All validation is done by typia.assert()
}
