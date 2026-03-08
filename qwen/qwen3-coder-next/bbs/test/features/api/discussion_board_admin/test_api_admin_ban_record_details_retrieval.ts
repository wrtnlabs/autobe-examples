import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_ban_record_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "Admin123!",
      display_name: "Admin User",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a test user to ban
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // Create ban record using utility function
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        ban_reason: "Violated community guidelines",
        discussion_board_member_id: memberId,
        administrator_id: admin.id,
      },
    },
  );
  typia.assert(banRecord);
  // Retrieve ban record details
  const retrieved = await api.functional.discussionBoard.admin.bans.at(
    adminConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(retrieved);
  // Validate response structure
  TestValidator.equals("ban ID matches", retrieved.id, banRecord.id);
  TestValidator.equals(
    "user summary exists",
    typeof retrieved.user.id,
    "string",
  );
  TestValidator.equals(
    "administrator summary exists",
    typeof retrieved.administrator.id,
    "string",
  );
  TestValidator.equals(
    "ban reason matches",
    retrieved.ban_reason,
    "Violated community guidelines",
  );
  TestValidator.equals(
    "timestamp formats",
    typeof retrieved.banned_at,
    "string",
  );
  TestValidator.equals(
    "created_at present",
    typeof retrieved.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at present",
    typeof retrieved.updated_at,
    "string",
  );
  TestValidator.equals(
    "deleted_at present",
    typeof retrieved.deleted_at,
    "string",
  );
  TestValidator.equals("unbanned_at is null", retrieved.unbanned_at, null);
}
