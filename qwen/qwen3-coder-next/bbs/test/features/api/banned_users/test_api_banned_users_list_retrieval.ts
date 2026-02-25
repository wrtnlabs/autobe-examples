import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_banned_users_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register super administrator to access banned users list
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(superAdmin);
  // Step 2: Retrieve banned users list (with super admin authentication)
  const result = await api.functional.discussionBoard.superAdmin.bans.index(
    superAdminConnection,
    {
      body: {
        search: "",
        isActive: false,
        isAdmin: null,
        isSuperAdmin: null,
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(result);
  // Step 3: Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", result.data !== undefined, true);
  TestValidator.predicate("has valid pagination metadata", () => {
    const p = result.pagination;
    return (
      p.current >= 1 &&
      p.limit >= 1 &&
      p.records >= 0 &&
      p.pages >= 0 &&
      p.current <= p.pages
    );
  });
  // Step 4: Validate banned user data structure when users exist
  if (result.data.length > 0) {
    const firstUser = result.data[0];
    TestValidator.equals(
      "has display_name",
      firstUser.display_name !== undefined,
      true,
    );
    TestValidator.equals("has email", firstUser.email !== undefined, true);
    TestValidator.equals(
      "has created_at",
      firstUser.created_at !== undefined,
      true,
    );
    TestValidator.equals("is_active is false", firstUser.is_active, false);
    TestValidator.equals(
      "has is_admin",
      firstUser.is_admin !== undefined,
      true,
    );
    TestValidator.equals(
      "has is_super_admin",
      firstUser.is_super_admin !== undefined,
      true,
    );
  }
  // Step 5: Test search functionality with empty search
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          search: "",
          isActive: false,
          isAdmin: null,
          isSuperAdmin: null,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult1);
  // Step 6: Test with specific search query
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          search: "test",
          isActive: false,
          isAdmin: null,
          isSuperAdmin: null,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult2);
  // Step 7: Test pagination parameters
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          search: "",
          isActive: false,
          isAdmin: null,
          isSuperAdmin: null,
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedResult);
  // Step 8: Verify pagination metadata consistency
  TestValidator.equals(
    "page count matches",
    paginatedResult.pagination.pages >= 0,
    true,
  );
  TestValidator.equals("limit matches", paginatedResult.pagination.limit, 5);
  TestValidator.equals(
    "page number matches",
    paginatedResult.pagination.current,
    2,
  );
}
