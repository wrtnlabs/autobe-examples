import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_bans_create";
import { generate_random_discussion_board_administrator_administrator_unbans_create_unban } from "../../../generate/generate_random_discussion_board_administrator_administrator_unbans_create_unban";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";
import { prepare_random_discussion_board_user_unban } from "../../../prepare/prepare_random_discussion_board_user_unban";

export async function test_api_administrator_unban_success_and_invalid_ban_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join (register and login)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
      },
    },
  );
  typia.assert(adminJoinResponse);
  // 2. Create a user ban record to be unbanned later
  const banRecord =
    await generate_random_discussion_board_administrator_administrator_bans_create(
      adminConnection,
      {},
    );
  typia.assert(banRecord);
  // 3. Call unban API with valid ban record
  const unbanReason = "Test unban reason";
  const unbanResponse =
    await generate_random_discussion_board_administrator_administrator_unbans_create_unban(
      adminConnection,
      {
        body: {
          userBanId: banRecord.id,
          administratorId: adminJoinResponse.id,
          reason: unbanReason,
        },
      },
    );
  typia.assert(unbanResponse);
  // Validate unban response content
  TestValidator.equals(
    "Unban record contains correct userBan ID",
    unbanResponse.userBan.id,
    banRecord.id,
  );
  TestValidator.equals(
    "Unban record contains correct administrator ID",
    unbanResponse.administrator.id,
    adminJoinResponse.id,
  );
  TestValidator.equals(
    "Unban reason matches",
    unbanResponse.reason,
    unbanReason,
  );
  // 4. Verify the ban record reflects unbanned state (soft deletion or similar)
  // We assume that banned record is now soft deleted or marked; check that updatedAt changed
  // Refetching or checking by a fresh call is impossible here due to lack of API for ban fetch, so skip this test.
  // 5. The user can login again after unbanning
  // For this, we need the banned user's email and password. However, ban record has only registeredUser summary which doesn't hold password.
  // We do not have password of registered user in ban record, so skip login test of unbanned user as not possible.
  // 6. Test unban with invalid userBanId (nonexistent ban record)
  await TestValidator.error(
    "unban with invalid userBanId throws error",
    async () => {
      await generate_random_discussion_board_administrator_administrator_unbans_create_unban(
        adminConnection,
        {
          body: {
            userBanId: typia.random<string & tags.Format<"uuid">>(),
            administratorId: adminJoinResponse.id,
            reason: "Invalid ban ID test",
          },
        },
      );
    },
  );
}
