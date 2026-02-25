import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_banned_users_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Step 2: Create test users that will be used for banned user search
  // Note: Since we don't have explicit ban endpoints in the provided API,
  // we'll test the search functionality with the available data structure
  // Step 3: Test search functionality with partial display_name match
  const searchResult1 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "john",
        isActive: false,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(searchResult1);
  // Step 4: Test filter by is_admin status
  const adminFilterResult =
    await api.functional.discussionBoard.admin.bans.index(adminConnection, {
      body: {
        search: "bob",
        isActive: false,
        isAdmin: true,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(adminFilterResult);
  // Step 5: Test filter by is_super_admin status
  const superAdminFilterResult =
    await api.functional.discussionBoard.admin.bans.index(adminConnection, {
      body: {
        search: "charlie",
        isActive: false,
        isSuperAdmin: true,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(superAdminFilterResult);
  // Step 6: Test combined search and filter parameters
  const combinedResult = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "test",
        isActive: false,
        isAdmin: false,
        isSuperAdmin: false,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Step 7: Test empty search results
  const emptyResult = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "nonexistent_user_xyz123",
        isActive: false,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns empty array",
    emptyResult.data.length,
    0,
  );
  // Step 8: Test pagination structure
  TestValidator.equals(
    "pagination has correct structure",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.predicate("pagination fields valid", () => {
    const p = emptyResult.pagination;
    return p.current >= 0 && p.limit >= 0 && p.pages >= 0;
  });
  // Step 9: Test search with different parameters
  const allUsersResult = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        isActive: false,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(allUsersResult);
  // Step 10: Test search with no filters
  const noFiltersResult = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "",
        isActive: null,
        isAdmin: null,
        isSuperAdmin: null,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(noFiltersResult);
}
