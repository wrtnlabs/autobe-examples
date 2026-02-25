import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { generate_random_discussion_board_unbans_create } from "../../../generate/generate_random_discussion_board_unbans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";
import { prepare_random_discussion_board_unban } from "../../../prepare/prepare_random_discussion_board_unban";

/**
 * Test filtering unban records by administrator_id.
 *
 * This test validates that the unban list API correctly filters results
 * when the administrator_id parameter is provided, enabling audit trail
 * queries by specific administrators.
 */
export async function test_api_unban_list_filter_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for ban/unban operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize as admin (test environment should grant admin privileges)
  await authorize_user_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminTest123!",
      displayName: `Admin_${RandomGenerator.alphabets(8)}`,
    },
  });
  // Create a user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const bannedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "UserTest123!",
      displayName: `User_${RandomGenerator.alphabets(8)}`,
    },
  });
  // Create a ban record for the user
  const banRecord = await generate_random_discussion_board_bans_create(
    adminConnection,
    {
      body: {
        userId: bannedUser.id,
        reason: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(banRecord);
  // Create an unban record
  const unbanRecord = await generate_random_discussion_board_unbans_create(
    adminConnection,
    {
      body: {
        discussion_board_ban_id: banRecord.id,
        reason: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(unbanRecord);
  // Get the administrator ID from the unban record
  const administratorId = unbanRecord.administrator.id;
  // Test 1: Query unban list filtering by the administrator ID
  const filteredResult = await api.functional.discussionBoard.unbans.index(
    adminConnection,
    {
      body: {
        administrator_id: administratorId,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(filteredResult);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination exists",
    filteredResult.pagination !== null &&
      filteredResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    filteredResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 10",
    filteredResult.pagination.limit === 10,
  );
  // Verify all results have the correct administrator_id
  TestValidator.predicate(
    "at least one unban record exists",
    filteredResult.data.length > 0,
  );
  for (const unban of filteredResult.data) {
    TestValidator.equals(
      "administrator ID matches filter",
      unban.administrator.id,
      administratorId,
    );
  }
  // Test 2: Query with non-existent administrator_id
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult = await api.functional.discussionBoard.unbans.index(
    adminConnection,
    {
      body: {
        administrator_id: nonExistentAdminId,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "no results for non-existent administrator",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals("records count is 0", emptyResult.pagination.records, 0);
  // Test 3: Verify the created unban is in the filtered results
  const foundCreated = filteredResult.data.some(
    (unban) => unban.id === unbanRecord.id,
  );
  TestValidator.predicate(
    "created unban record found in filtered results",
    foundCreated,
  );
}
