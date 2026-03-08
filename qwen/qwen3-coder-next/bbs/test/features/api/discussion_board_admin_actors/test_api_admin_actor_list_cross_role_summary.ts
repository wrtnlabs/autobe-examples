import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_actor_list_cross_role_summary(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@discussion.test",
      password: "AdminPassword123!",
      display_name: "Admin User",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Get default actor list without filters
  const defaultResult = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultResult);
  // Validate basic structure
  TestValidator.equals(
    "pagination exists",
    defaultResult.pagination.current >= 0,
    true,
  );
  TestValidator.predicate("data is array", Array.isArray(defaultResult.data));
  // Test 2: Get actor list with pagination
  const paginatedResult =
    await api.functional.discussionBoard.admin.actors.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination page matches",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginatedResult.pagination.limit <= 100,
  );
  // Test 3: Get actor list with role filter
  const roleFilteredResult =
    await api.functional.discussionBoard.admin.actors.index(adminConnection, {
      body: {
        role: "admin",
      },
    });
  typia.assert(roleFilteredResult);
  // Test 4: Get actor list with status filter
  const statusFilteredResult =
    await api.functional.discussionBoard.admin.actors.index(adminConnection, {
      body: {
        status: "active",
      },
    });
  typia.assert(statusFilteredResult);
  // Test 5: Get actor list with search
  const searchResult = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {
        search: "admin",
      },
    },
  );
  typia.assert(searchResult);
  // Test 6: Get actor list with date range
  const dateResult = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {
        createdAtFrom: "2024-01-01T00:00:00Z",
        createdAtTo: "2026-12-31T23:59:59Z",
      },
    },
  );
  typia.assert(dateResult);
  // Test 7: Verify actor summary structure
  if (defaultResult.data.length > 0) {
    const firstActor = defaultResult.data[0];
    TestValidator.equals("actor has id", firstActor.id !== undefined, true);
    TestValidator.equals(
      "actor has session_token",
      firstActor.session_token !== undefined,
      true,
    );
    TestValidator.equals(
      "actor has created_at",
      firstActor.created_at !== undefined,
      true,
    );
    TestValidator.predicate(
      "actor id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstActor.id,
      ),
    );
    TestValidator.predicate(
      "created_at is ISO format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        firstActor.created_at,
      ),
    );
  }
  // Test 8: Verify pagination integrity
  TestValidator.equals(
    "pagination records non-negative",
    defaultResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages non-negative",
    defaultResult.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit positive",
    defaultResult.pagination.limit > 0,
    true,
  );
  // Test 9: Empty page test
  const emptyPageResult =
    await api.functional.discussionBoard.admin.actors.index(adminConnection, {
      body: {
        page: 999999,
        limit: 10,
      },
    });
  typia.assert(emptyPageResult);
  TestValidator.equals(
    "empty page returns empty data",
    emptyPageResult.data.length,
    0,
  );
  // Test 10: Zero limit test
  const zeroLimitResult =
    await api.functional.discussionBoard.admin.actors.index(adminConnection, {
      body: {
        limit: 0,
      },
    });
  typia.assert(zeroLimitResult);
}
