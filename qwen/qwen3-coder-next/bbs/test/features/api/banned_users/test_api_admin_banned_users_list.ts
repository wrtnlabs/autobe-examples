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

export async function test_api_admin_banned_users_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as admin user to establish authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Test basic banned users listing with pagination
  const basicList = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        isActive: false, // Only get banned users (is_active=false)
        isAdmin: null,
        isSuperAdmin: null,
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(basicList);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    basicList.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", basicList.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has records",
    basicList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    basicList.pagination.pages >= 0,
  );
  // 3. Test search functionality with empty search (should return all)
  const searchList = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
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
  typia.assert(searchList);
  // 4. Test filtering by is_active=false (banned users only)
  const bannedUsersList = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        isActive: false,
        isAdmin: false,
        isSuperAdmin: false,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(bannedUsersList);
  // Validate that banned users have is_active=false
  bannedUsersList.data.forEach((user) => {
    TestValidator.equals("banned user is inactive", user.is_active, false);
  });
  // 5. Test filtering with pagination
  const paginatedList = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        isActive: false,
        isAdmin: null,
        isSuperAdmin: null,
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(paginatedList);
  TestValidator.equals(
    "pagination limit is 5",
    paginatedList.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "returned items <= limit",
    paginatedList.data.length <= 5,
  );
  // 6. Test that banned users have required fields
  if (bannedUsersList.data.length > 0) {
    const sampleUser = bannedUsersList.data[0];
    TestValidator.predicate(
      "has valid UUID",
      /^[0-9a-f-]{36}$/i.test(sampleUser.id),
    );
    TestValidator.predicate(
      "has valid email format",
      sampleUser.email !== undefined && sampleUser.email !== null,
    );
    TestValidator.predicate(
      "has display_name",
      typeof sampleUser.display_name === "string",
    );
    TestValidator.equals(
      "banned user structure complete",
      sampleUser.is_active,
      false,
    );
  }
  // 7. Test admin filtering (should exclude admins)
  const nonAdminBannedList =
    await api.functional.discussionBoard.admin.bans.index(adminConnection, {
      body: {
        isActive: false,
        isAdmin: false,
        isSuperAdmin: false,
        page: 1,
        limit: 10,
      },
    });
  typia.assert(nonAdminBannedList);
  nonAdminBannedList.data.forEach((user) => {
    TestValidator.equals("no regular admins", user.is_admin, false);
    TestValidator.equals("no super admins", user.is_super_admin, false);
    TestValidator.equals("still banned", user.is_active, false);
  });
  // 8. Test without any filters (all users with is_active=false)
  const allBannedList = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        isActive: false,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(allBannedList);
  // Verify all returned users are banned
  allBannedList.data.forEach((user) => {
    TestValidator.equals("all users are banned", user.is_active, false);
  });
}
