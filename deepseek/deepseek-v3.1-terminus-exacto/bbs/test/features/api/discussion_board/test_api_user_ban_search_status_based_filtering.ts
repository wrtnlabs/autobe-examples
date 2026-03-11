import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_user_ban_search_status_based_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test searching for active bans
  const activeBans = await api.functional.discussionBoard.admin.user_bans.index(
    adminConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(activeBans);
  // Test searching for expired bans
  const expiredBans =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(expiredBans);
  // Test searching for removed bans
  const removedBans =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          status: "removed",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(removedBans);
  // Validate pagination structure and values
  TestValidator.equals(
    "pagination structure present",
    typeof activeBans.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    activeBans.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    activeBans.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    activeBans.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    activeBans.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(activeBans.data), true);
  // Validate ban summary structure for each ban record
  if (activeBans.data.length > 0) {
    const sampleBan = activeBans.data[0];
    TestValidator.predicate("ban has id", typeof sampleBan.id === "string");
    TestValidator.predicate(
      "ban has reason",
      typeof sampleBan.reason === "string",
    );
    TestValidator.predicate(
      "ban has status",
      typeof sampleBan.status === "string",
    );
    TestValidator.predicate(
      "ban has banned_at date",
      typeof sampleBan.banned_at === "string",
    );
    TestValidator.predicate(
      "ban has member object",
      typeof sampleBan.member === "object",
    );
    TestValidator.predicate(
      "ban has admin object",
      typeof sampleBan.admin === "object",
    );
    // Validate member structure
    if (sampleBan.member) {
      TestValidator.predicate(
        "member has id",
        typeof sampleBan.member.id === "string",
      );
      TestValidator.predicate(
        "member has display_name",
        typeof sampleBan.member.display_name === "string",
      );
    }
    // Validate admin structure
    if (sampleBan.admin) {
      TestValidator.predicate(
        "admin has id",
        typeof sampleBan.admin.id === "string",
      );
      TestValidator.predicate(
        "admin has email",
        typeof sampleBan.admin.email === "string",
      );
      TestValidator.predicate(
        "admin has admin_grade",
        typeof sampleBan.admin.admin_grade === "string",
      );
    }
  }
  // Test status filter with date range combination
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const dateFilteredBans =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          status: "active",
          banned_at_from: weekAgo,
          banned_at_to: now,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(dateFilteredBans);
  // Test reason text search
  const reasonSearchBans =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          status: "active",
          reason: "test",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(reasonSearchBans);
  // Validate that returned bans have correct status (if any exist)
  if (activeBans.data.length > 0) {
    TestValidator.predicate(
      "active bans have active status",
      activeBans.data.every((ban) => ban.status === "active"),
    );
  }
  if (expiredBans.data.length > 0) {
    TestValidator.predicate(
      "expired bans have expired status",
      expiredBans.data.every((ban) => ban.status === "expired"),
    );
  }
  if (removedBans.data.length > 0) {
    TestValidator.predicate(
      "removed bans have removed status",
      removedBans.data.every((ban) => ban.status === "removed"),
    );
  }
  // Test empty status filter (should return all bans)
  const allBans = await api.functional.discussionBoard.admin.user_bans.index(
    adminConnection,
    {
      body: {
        status: null,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(allBans);
  // Test combination of multiple filters
  const comprehensiveSearch =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          status: "active",
          reason: "violation",
          banned_at_from: weekAgo,
          banned_at_to: now,
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(comprehensiveSearch);
  // Validate pagination consistency
  TestValidator.predicate(
    "pagination records consistent",
    activeBans.pagination.records >= activeBans.data.length,
  );
  TestValidator.predicate(
    "pagination limit respected",
    activeBans.data.length <= activeBans.pagination.limit,
  );
}
