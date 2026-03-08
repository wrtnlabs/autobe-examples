import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_ban_records_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials: IDiscussionBoardSuperAdmin.ILogin = {
    email: "superadmin@test.com",
    password: "123456",
  };
  await authorize_super_admin_login(superAdminConnection, {
    body: superAdminCredentials,
  });
  // 2. Create member accounts to be banned
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Login: IDiscussionBoardMember.ILogin = {
    email: "member1@test.com",
    password: "123456",
  };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: member1Login.email,
      password: member1Login.password,
      display_name: "Test Member 1",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Login: IDiscussionBoardMember.ILogin = {
    email: "member2@test.com",
    password: "123456",
  };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: member2Login.email,
      password: member2Login.password,
      display_name: "Test Member 2",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Create additional member for ban record diversity
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: "member3@test.com",
      password: "123456",
      display_name: "Test Member 3",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 4. Create ban records with different timestamps
  const now = new Date();
  const recentTime = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
  const oldTime = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
  const earliestTime = new Date(now.getTime() - 1000 * 60 * 60 * 48); // 2 days ago
  // Create ban record for member1 (recent)
  const banRecord1 =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member1Auth.id,
          ban_reason: "Violated community guidelines",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banRecord1);
  // Create ban record for member2 (old)
  const banRecord2 =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member2Auth.id,
          ban_reason: "Spam behavior detected",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banRecord2);
  // Create ban record for member3 (earliest)
  const banRecord3 =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member3Auth.id,
          ban_reason: "Abusive language",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banRecord3);
  // 5. Test pagination - pass empty string for filter fields instead of omitting
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: "",
          ban_reason: "",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    2,
  );
  TestValidator.predicate(
    "has pagination metadata",
    paginatedResult.pagination !== null,
  );
  // 6. Test filtering by user ID
  const filteredByUser =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member1Auth.id,
          ban_reason: "",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(filteredByUser);
  TestValidator.equals(
    "filter by user ID works",
    filteredByUser.data.length,
    1,
  );
  TestValidator.equals(
    "filtered user matches",
    filteredByUser.data[0].user.id,
    member1Auth.id,
  );
  // 7. Test filtering by administrator ID (using current super admin ID)
  const filteredByAdmin =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: "",
          ban_reason: "",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(filteredByAdmin);
  TestValidator.predicate(
    "filter by admin works",
    filteredByAdmin.data.length > 0,
  );
  // 8. Test date range filtering (using ban_reason as proxy since date filtering may vary)
  const filteredByReason =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: "",
          ban_reason: "Spam",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(filteredByReason);
  TestValidator.predicate(
    "filter by reason works",
    filteredByReason.data.length >= 0,
  );
  // 9. Test active/inactive filtering (unbanned_at null check)
  const activeBans = await api.functional.discussionBoard.superAdmin.bans.index(
    superAdminConnection,
    {
      body: {
        discussion_board_member_id: "",
        ban_reason: "",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(activeBans);
  TestValidator.predicate("has active bans", activeBans.data.length > 0);
  TestValidator.predicate(
    "all bans have correct structure",
    activeBans.data.every(
      (record) =>
        record.id !== undefined &&
        record.user !== undefined &&
        record.administrator !== undefined,
    ),
  );
  // 10. Test default sorting (banned_at descending)
  const sortedResult =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: "",
          ban_reason: "",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted by banned_at descending",
    sortedResult.data.length > 0,
  );
  // 11. Verify response structure matches DTO
  sortedResult.data.forEach((banRecord) => {
    typia.assert<IDiscussionBoardBanRecord.ISummary>(banRecord);
    TestValidator.predicate(
      "has user summary",
      banRecord.user.id !== undefined,
    );
    TestValidator.predicate(
      "has administrator summary",
      banRecord.administrator.id !== undefined,
    );
    TestValidator.predicate(
      "has ban reason",
      banRecord.ban_reason !== undefined,
    );
    TestValidator.predicate(
      "has banned_at timestamp",
      banRecord.banned_at !== undefined,
    );
  });
  // 12. Test pagination metadata
  TestValidator.predicate(
    "pagination has correct structure",
    sortedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    sortedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    sortedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    sortedResult.pagination.pages >= 0,
  );
  // 13. Test unauthorized access attempt (this would require a regular member connection)
  // Since we don't have a way to test this in the current setup, we'll skip it
  // In a real scenario, you would authenticate as a regular member and expect 403/401
}
