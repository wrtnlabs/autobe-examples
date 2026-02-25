import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { generate_random_discussion_board_user_admin_requests_create } from "../../../generate/generate_random_discussion_board_user_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

export async function test_api_ban_list_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user who will perform the ban action
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_user_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: `Admin${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Step 2: Create regular user who will be banned
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: `User${RandomGenerator.alphabets(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(userAuth);
  // Step 3: Submit admin request for the admin user
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      adminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(adminRequest);
  // Step 4: Approve the admin request
  const approvedRequest =
    await api.functional.discussionBoard.user.adminRequests.approve(
      adminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          reviewNotes: "Approved for E2E testing purposes",
        } satisfies IDiscussionBoardAdminRequest.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // Step 5: Create a ban record
  const banReason = `Violation of community guidelines: ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const banRecord = await generate_random_discussion_board_bans_create(
    adminConnection,
    {
      body: {
        userId: userAuth.id,
        reason: banReason,
      },
    },
  );
  typia.assert(banRecord);
  // Step 6: Call PATCH /discussionBoard/bans to retrieve ban list
  const banList = await api.functional.discussionBoard.bans.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(banList);
  // Verify pagination metadata
  TestValidator.predicate("pagination exists", banList.pagination !== null);
  TestValidator.predicate(
    "current page is at least 1",
    banList.pagination.current >= 1,
  );
  TestValidator.predicate("limit is at least 1", banList.pagination.limit >= 1);
  TestValidator.predicate(
    "records is non-negative",
    banList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    banList.pagination.pages >= 0,
  );
  // Verify data array
  TestValidator.predicate("data is array", Array.isArray(banList.data));
  TestValidator.predicate(
    "data has at least one record",
    banList.data.length >= 1,
  );
  // Find our created ban in the list
  const foundBan = banList.data.find((ban) => ban.id === banRecord.id);
  TestValidator.predicate("created ban found in list", foundBan !== undefined);
  // Verify ban record structure
  if (foundBan) {
    TestValidator.equals("ban id matches", foundBan.id, banRecord.id);
    TestValidator.equals(
      "ban reason matches",
      foundBan.reason,
      banRecord.reason,
    );
    TestValidator.predicate("ban has created_at", foundBan.created_at !== null);
    // Verify user information
    TestValidator.predicate("ban has user", foundBan.user !== null);
    if (foundBan.user) {
      TestValidator.equals("user id matches", foundBan.user.id, userAuth.id);
      TestValidator.equals(
        "user display name matches",
        foundBan.user.displayName,
        userAuth.displayName,
      );
      TestValidator.equals(
        "user email matches",
        foundBan.user.email,
        userAuth.email,
      );
    }
    // Verify administrator information
    if (foundBan.administrator) {
      TestValidator.equals(
        "admin id matches",
        foundBan.administrator.id,
        adminAuth.id,
      );
      TestValidator.equals(
        "admin display name matches",
        foundBan.administrator.displayName,
        adminAuth.displayName,
      );
      TestValidator.equals(
        "admin email matches",
        foundBan.administrator.email,
        adminAuth.email,
      );
    }
  }
  // Verify sorting: most recent bans first (descending by created_at)
  if (banList.data.length > 1) {
    for (let i = 0; i < banList.data.length - 1; i++) {
      const current = new Date(banList.data[i].created_at).getTime();
      const next = new Date(banList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `bans sorted descending at index ${i}`,
        current >= next,
      );
    }
  }
  // Test pagination with limit parameter
  const limitedList = await api.functional.discussionBoard.bans.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(limitedList);
  TestValidator.predicate(
    "limited list has max 5 items",
    limitedList.data.length <= 5,
  );
  // Test filtering by administrator
  const filteredList = await api.functional.discussionBoard.bans.index(
    adminConnection,
    {
      body: {
        administratorId: adminAuth.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(filteredList);
  for (const ban of filteredList.data) {
    if (ban.administrator) {
      TestValidator.equals(
        "filtered by administrator",
        ban.administrator.id,
        adminAuth.id,
      );
    }
  }
  // Test search by email
  const emailSearchList = await api.functional.discussionBoard.bans.index(
    adminConnection,
    {
      body: {
        email: userAuth.email,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(emailSearchList);
  const foundByEmail = emailSearchList.data.find(
    (ban) => ban.user.email === userAuth.email,
  );
  TestValidator.predicate(
    "found banned user by email",
    foundByEmail !== undefined,
  );
  // Test search by display name
  const nameSearchList = await api.functional.discussionBoard.bans.index(
    adminConnection,
    {
      body: {
        displayName: userAuth.displayName,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(nameSearchList);
  const foundByName = nameSearchList.data.find(
    (ban) => ban.user.displayName === userAuth.displayName,
  );
  TestValidator.predicate(
    "found banned user by display name",
    foundByName !== undefined,
  );
}
