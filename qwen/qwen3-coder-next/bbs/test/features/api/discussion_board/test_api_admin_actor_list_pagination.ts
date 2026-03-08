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

export async function test_api_admin_actor_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12) + "1!",
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test pagination with default parameters
  const defaultResult = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has valid limit",
    defaultResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has valid records count",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    defaultResult.pagination.records === 0
      ? defaultResult.pagination.pages === 0
      : Math.ceil(
          defaultResult.pagination.records / defaultResult.pagination.limit,
        ) === defaultResult.pagination.pages,
  );
  // 3. Test with specific page and limit
  const pageResult = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(pageResult);
  TestValidator.equals("page 1 requested", pageResult.pagination.current, 1);
  TestValidator.equals("limit 10 applied", pageResult.pagination.limit, 10);
  TestValidator.predicate(
    "data array length matches limit or less",
    pageResult.data.length <= 10,
  );
  // 4. Test empty page (page beyond available data)
  if (defaultResult.pagination.records > 0) {
    const emptyPageResult =
      await api.functional.discussionBoard.admin.actors.index(adminConnection, {
        body: {
          page: defaultResult.pagination.pages + 1,
          limit: 10,
        },
      });
    typia.assert(emptyPageResult);
    TestValidator.equals(
      "empty page returns empty array",
      emptyPageResult.data.length,
      0,
    );
  }
  // 5. Test with search parameter
  const searchResult = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {
        search: "test",
      },
    },
  );
  typia.assert(searchResult);
  // 6. Test with role filter
  const roleResult = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {
        role: "member",
      },
    },
  );
  typia.assert(roleResult);
  // 7. Test with status filter
  const statusResult = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(statusResult);
  // 8. Verify data items have correct structure
  for (const item of defaultResult.data) {
    typia.assert<IDiscussionBoardGuest.ISummary>(item);
    TestValidator.predicate(
      "has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(item.id),
    );
    TestValidator.equals(
      "has session_token",
      typeof item.session_token,
      "string",
    );
    TestValidator.predicate(
      "has valid date-time created_at",
      item.created_at !== null &&
        item.created_at !== undefined &&
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.\d{3}Z$/.test(
          item.created_at,
        ),
    );
  }
}
