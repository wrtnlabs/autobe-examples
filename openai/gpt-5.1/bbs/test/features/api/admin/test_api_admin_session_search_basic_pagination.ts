import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminuserSession";

export async function test_api_admin_session_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join a new admin user and obtain authorization (token is applied by SDK)
  const joinRequest = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const authorized = await api.functional.auth.adminUser.join(connection, {
    body: joinRequest,
  });
  typia.assert(authorized);

  const adminUserId = authorized.id;

  // 2. Call sessions.index with basic pagination (page=1, limit=10) and no filters
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAdminuserSession.IRequest;

  const firstPage =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: requestBody,
      },
    );
  typia.assert<IPageIDiscussionBoardAdminuserSession.ISummary>(firstPage);

  const pagination = firstPage.pagination;

  // 3. Basic pagination validations
  TestValidator.predicate(
    "pagination.current should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination.limit should be positive and not exceed requested limit",
    pagination.limit > 0 && pagination.limit <= 10,
  );

  TestValidator.predicate(
    "pagination.records should be >= number of data items",
    pagination.records >= firstPage.data.length,
  );

  TestValidator.predicate(
    "pagination.pages should be consistent with records and limit",
    pagination.limit === 0
      ? pagination.pages === 0 && pagination.records === 0
      : pagination.records === 0
        ? pagination.pages === 0
        : pagination.pages >= 1 &&
          pagination.pages <= Math.ceil(pagination.records / pagination.limit),
  );

  if (pagination.pages > 0) {
    TestValidator.predicate(
      "pagination.current should be less than total pages when pages > 0",
      pagination.current < pagination.pages,
    );
  }

  // 4. Per-session validations when sessions exist
  if (firstPage.data.length > 0) {
    for (const session of firstPage.data) {
      TestValidator.equals(
        "session.discussion_board_adminuser_id must match path adminUserId",
        session.discussion_board_adminuser_id,
        adminUserId,
      );

      TestValidator.equals(
        "session.adminUser.id must equal discussion_board_adminuser_id",
        session.adminUser.id,
        session.discussion_board_adminuser_id,
      );
    }
  }

  // 5. Idempotency: same request should yield same pagination and data
  const secondPage =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: requestBody,
      },
    );
  typia.assert<IPageIDiscussionBoardAdminuserSession.ISummary>(secondPage);

  TestValidator.equals(
    "pagination object should be identical between first and second calls",
    firstPage.pagination,
    secondPage.pagination,
  );

  TestValidator.equals(
    "data array should be identical between first and second calls",
    firstPage.data,
    secondPage.data,
  );
}
