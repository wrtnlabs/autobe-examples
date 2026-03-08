import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_ban_record_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "Admin123!@#",
      display_name: "Admin User",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const adminId = adminAuthorized.id;
  // 2. Create test data: Multiple members to be banned
  const memberConnections: api.IConnection[] = [];
  const members: IDiscussionBoardMember.ISummary[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "Member123!@#",
        display_name: `Member ${i + 1}`,
      } satisfies IDiscussionBoardMember.IJoin,
    });
    memberConnections.push(memberConnection);
    members.push({
      id: member.id,
      display_name: member.display_name,
      bio: member.bio,
    });
  }
  // 3. Create multiple ban records (5 total)
  await api.functional.discussionBoard.admin.bans.create(adminConnection, {
    body: {
      ban_reason: "Spam account",
      discussion_board_member_id: members[0].id,
      administrator_id: adminId,
    } satisfies IDiscussionBoardBanRecord.ICreate,
  });
  await api.functional.discussionBoard.admin.bans.create(adminConnection, {
    body: {
      ban_reason: "Temporary violation",
      discussion_board_member_id: members[1].id,
      administrator_id: adminId,
    } satisfies IDiscussionBoardBanRecord.ICreate,
  });
  await api.functional.discussionBoard.admin.bans.create(adminConnection, {
    body: {
      ban_reason: "Harassment",
      discussion_board_member_id: members[2].id,
      administrator_id: adminId,
    } satisfies IDiscussionBoardBanRecord.ICreate,
  });
  await api.functional.discussionBoard.admin.bans.create(adminConnection, {
    body: {
      ban_reason: "Trolling",
      discussion_board_member_id: members[0].id,
      administrator_id: adminId,
    } satisfies IDiscussionBoardBanRecord.ICreate,
  });
  await api.functional.discussionBoard.admin.bans.create(adminConnection, {
    body: {
      ban_reason: "Violation of community guidelines",
      discussion_board_member_id: members[1].id,
      administrator_id: adminId,
    } satisfies IDiscussionBoardBanRecord.ICreate,
  });
  // 4. Test default pagination (page 1, default limit)
  const defaultResult = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        discussion_board_member_id: "",
        ban_reason: "",
        page: null,
        limit: null,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 100",
    defaultResult.pagination.limit,
    100,
  );
  TestValidator.predicate("has records", defaultResult.data.length > 0);
  // 5. Test custom pagination (page 2, limit 2)
  const page2Result = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        discussion_board_member_id: "",
        ban_reason: "",
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2", page2Result.pagination.current, 2);
  TestValidator.equals("limit 2", page2Result.pagination.limit, 2);
  TestValidator.equals("has 2 records", page2Result.data.length, 2);
  // 6. Test user ID filter
  const userFilterResult =
    await api.functional.discussionBoard.admin.bans.index(adminConnection, {
      body: {
        discussion_board_member_id: members[0].id,
        ban_reason: "",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    });
  typia.assert(userFilterResult);
  TestValidator.predicate(
    "all records belong to user",
    userFilterResult.data.every((r) => r.user.id === members[0].id),
  );
  // 7. Test boundary conditions
  try {
    await api.functional.discussionBoard.admin.bans.index(adminConnection, {
      body: {
        discussion_board_member_id: "",
        ban_reason: "",
        page: 0,
        limit: 100,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    });
    throw new Error("Should have thrown error for page 0");
  } catch (error: any) {
    TestValidator.predicate(
      "page 0 handled",
      error.status === 400 || error.status === 422 || error.status === 500,
    );
  }
  // Page beyond available pages should return empty array
  const emptyPageResult = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        discussion_board_member_id: "",
        ban_reason: "",
        page: 9999,
        limit: 100,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(emptyPageResult);
  TestValidator.equals(
    "empty page has no records",
    emptyPageResult.data.length,
    0,
  );
  // 8. Test authorization
  // Guest access should return 401
  try {
    const guestConnection: api.IConnection = { host: connection.host };
    await api.functional.discussionBoard.admin.bans.index(guestConnection, {
      body: {
        discussion_board_member_id: "",
        ban_reason: "",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    });
    throw new Error("Should have thrown 401");
  } catch (error: any) {
    TestValidator.equals("guest returns 401", error.status, 401);
  }
  // Regular member access should return 403
  try {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(memberConnection, {
      body: {
        email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "Member123!@#",
      } satisfies IDiscussionBoardMember.ILogin,
    });
    await api.functional.discussionBoard.admin.bans.index(memberConnection, {
      body: {
        discussion_board_member_id: "",
        ban_reason: "",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    });
    throw new Error("Should have thrown 403");
  } catch (error: any) {
    TestValidator.equals("member returns 403", error.status, 403);
  }
}
