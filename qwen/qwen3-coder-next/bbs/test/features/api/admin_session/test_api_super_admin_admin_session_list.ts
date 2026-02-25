import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_admin_session_list(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create test administrator sessions
  const testAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(testAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Basic pagination structure
  const basicList =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(basicList);
  TestValidator.equals(
    "pagination has current",
    basicList.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", basicList.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    basicList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    basicList.pagination.pages >= 0,
  );
  // Test 2: Filter by adminId
  if (basicList.data.length > 0) {
    const firstAdminId = basicList.data[0].admin.id;
    const filteredByAdmin =
      await api.functional.discussionBoard.superAdmin.admin_sessions.index(
        superAdminConnection,
        {
          body: {
            adminId: firstAdminId,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardAdminSession.IRequest,
        },
      );
    typia.assert(filteredByAdmin);
    filteredByAdmin.data.forEach((session) => {
      TestValidator.equals(
        "all sessions match adminId",
        session.admin.id,
        firstAdminId,
      );
    });
  }
  // Test 3: Filter by IP address
  if (basicList.data.length > 0) {
    const sampleIP = basicList.data[0].ip;
    const filteredByIP =
      await api.functional.discussionBoard.superAdmin.admin_sessions.index(
        superAdminConnection,
        {
          body: {
            ip: sampleIP,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardAdminSession.IRequest,
        },
      );
    typia.assert(filteredByIP);
    filteredByIP.data.forEach((session) => {
      TestValidator.equals("all sessions match IP", session.ip, sampleIP);
    });
  }
  // Test 4: Time range filtering
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const timeFiltered =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          createdFrom: yesterday,
          createdTo: now,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(timeFiltered);
  // Test 5: isActive filter
  const activeSessions =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          isActive: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  const expiredSessions =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          isActive: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // Test 6: Sorting by created_at descending
  const sortedByCreated =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sortedByCreated);
  // Test 7: Empty result set
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.admin_sessions.index(
      superAdminConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data", emptyResult.data.length, 0);
  // Test 8: Response structure validation
  if (basicList.data.length > 0) {
    const sampleSession = basicList.data[0];
    TestValidator.predicate(
      "session has id",
      typeof sampleSession.id === "string",
    );
    TestValidator.predicate(
      "session has ip",
      typeof sampleSession.ip === "string",
    );
    TestValidator.predicate(
      "session has href",
      typeof sampleSession.href === "string",
    );
    TestValidator.predicate(
      "session has created_at",
      typeof sampleSession.created_at === "string",
    );
    TestValidator.predicate(
      "session has expired_at",
      typeof sampleSession.expired_at === "string",
    );
    TestValidator.predicate(
      "session has admin",
      sampleSession.admin !== null && sampleSession.admin !== undefined,
    );
    if (sampleSession.admin) {
      TestValidator.equals(
        "admin has id",
        typeof sampleSession.admin.id === "string",
        true,
      );
      TestValidator.equals(
        "admin has display_name",
        typeof sampleSession.admin.display_name === "string",
        true,
      );
      TestValidator.equals(
        "admin has email",
        typeof sampleSession.admin.email === "string",
        true,
      );
      TestValidator.equals(
        "admin has is_super_admin",
        typeof sampleSession.admin.is_super_admin === "boolean",
        true,
      );
      TestValidator.equals(
        "admin has is_active",
        typeof sampleSession.admin.is_active === "boolean",
        true,
      );
      TestValidator.equals(
        "admin has created_at",
        typeof sampleSession.admin.created_at === "string",
        true,
      );
      TestValidator.equals(
        "admin has updated_at",
        typeof sampleSession.admin.updated_at === "string",
        true,
      );
      TestValidator.equals(
        "admin has deleted_at",
        sampleSession.admin.deleted_at === null ||
          typeof sampleSession.admin.deleted_at === "string",
        true,
      );
    }
  }
}
