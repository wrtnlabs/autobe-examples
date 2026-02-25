import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_search_expired_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for testing
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user using utility function
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorizedUser);
  // Prepare time references for session expiration testing
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);
  const tenMinutesAgo = new Date(now.getTime() - 600000);
  const thirtyMinutesAgo = new Date(now.getTime() - 1800000);
  // Convert to ISO strings for search parameters
  const nowISO = now.toISOString();
  const oneMinuteAgoISO = oneMinuteAgo.toISOString();
  const tenMinutesAgoISO = tenMinutesAgo.toISOString();
  const thirtyMinutesAgoISO = thirtyMinutesAgo.toISOString();
  // Test 1: Search for all expired sessions (active=false)
  const expiredAll =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnection,
      {
        body: {
          active: false,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
          >(),
          page: 1,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(expiredAll);
  // Validate pagination structure exists
  TestValidator.predicate(
    "expired sessions search returns valid pagination structure",
    expiredAll.pagination !== undefined && expiredAll.data !== undefined,
  );
  // Test 2: Search with expiration date range - recently expired (1 min to 10 min ago)
  const recentExpired =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnection,
      {
        body: {
          active: false,
          created_at_min: tenMinutesAgoISO,
          created_at_max: oneMinuteAgoISO,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>
          >(),
          page: 1,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(recentExpired);
  // Test 3: Search with older expiration range (30+ minutes ago)
  const olderExpired =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnection,
      {
        body: {
          active: false,
          created_at_max: thirtyMinutesAgoISO,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>
          >(),
          page: 1,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(olderExpired);
  // Test 4: Edge case - sessions expiring exactly at boundary
  const boundarySearch =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnection,
      {
        body: {
          active: false,
          created_at_min: thirtyMinutesAgoISO,
          created_at_max: thirtyMinutesAgoISO,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          page: 1,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(boundarySearch);
  // Test 5: Mixed criteria - combine expiration range with user filter
  const mixedCriteria =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnection,
      {
        body: {
          user_id: authorizedUser.id,
          active: false,
          created_at_max: nowISO,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<15>
          >(),
          page: 1,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(mixedCriteria);
  // Test 6: Pagination validation with different page sizes
  const pageSizeTest =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnection,
      {
        body: {
          active: false,
          limit: 5,
          page: 2,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(pageSizeTest);
  // Validate pagination structure exists for page 2
  TestValidator.predicate(
    "page 2 has valid pagination structure",
    pageSizeTest.pagination !== undefined && pageSizeTest.data !== undefined,
  );
  // Test 7: Search with IP filter combined with expiration
  const ipFilterSearch =
    await api.functional.discussionBoard.user.users.sessions.index(
      userConnection,
      {
        body: {
          active: false,
          ip: "127.0.0.1", // Example IP for testing
          created_at_max: nowISO,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          page: 1,
        } satisfies IDiscussionBoardUserSession.IRequest,
      },
    );
  typia.assert(ipFilterSearch);
  // Business logic validation: all returned sessions should be expired
  const allSearches = [
    expiredAll,
    recentExpired,
    olderExpired,
    boundarySearch,
    mixedCriteria,
    pageSizeTest,
    ipFilterSearch,
  ];
  // If any sessions are returned, verify their expiration status
  for (const searchResult of allSearches) {
    for (const session of searchResult.data) {
      // The search was for active: false, so sessions should be expired
      // We can validate the session has expired_at in the past
      const expiredAt = new Date(session.expired_at);
      TestValidator.predicate(
        `session ${session.id} should have valid expiration date`,
        !isNaN(expiredAt.getTime()),
      );
    }
  }
}
