import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_user_bans_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Get all bans with default pagination
  const allBans =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(allBans);
  // Test 2: Filter by status "active"
  const activeBans =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(activeBans);
  // Validate that active bans only contain active status
  if (activeBans.data.length > 0) {
    TestValidator.predicate(
      "active bans only contain active status",
      activeBans.data.every((ban) => ban.status === "active"),
    );
  }
  // Test 3: Filter by status "expired"
  const expiredBans =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(expiredBans);
  // Test 4: Filter by status "removed"
  const removedBans =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          status: "removed",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(removedBans);
  // Test 5: Test pagination with small limit
  const paginatedBans =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(paginatedBans);
  TestValidator.predicate(
    "pagination metadata exists",
    paginatedBans.pagination.current === 1 &&
      paginatedBans.pagination.limit === 5,
  );
  // Test 6: Test date range filtering with current date
  const currentDate = new Date().toISOString();
  const recentBans =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          banned_at_to: currentDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(recentBans);
  // Test 7: Test combined filters with status and date
  const combinedBans =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          banned_at_to: currentDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(combinedBans);
  // Test 8: Test empty filter scenario
  const emptyFilterBans =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(emptyFilterBans);
  // Validate response structure for any returned bans
  if (allBans.data.length > 0) {
    const sampleBan = allBans.data[0];
    TestValidator.predicate(
      "ban has required fields",
      sampleBan.id !== undefined &&
        sampleBan.reason !== undefined &&
        sampleBan.status !== undefined &&
        sampleBan.banned_at !== undefined,
    );
    TestValidator.predicate(
      "ban has member information",
      sampleBan.member !== undefined &&
        sampleBan.member.id !== undefined &&
        sampleBan.member.display_name !== undefined,
    );
    TestValidator.predicate(
      "ban has admin information",
      sampleBan.admin !== undefined &&
        sampleBan.admin.id !== undefined &&
        sampleBan.admin.email !== undefined &&
        sampleBan.admin.admin_grade !== undefined,
    );
  }
  // Test 9: Test different page numbers
  const page2Bans =
    await api.functional.discussionBoard.superAdmin.user_bans.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(page2Bans);
  TestValidator.predicate(
    "page 2 has correct pagination",
    page2Bans.pagination.current === 2,
  );
}
