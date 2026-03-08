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

export async function test_api_admin_ban_status_active_ban(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    display_name: RandomGenerator.name(),
    bio: "Test admin for ban status testing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorizedAdmin);
  // Step 2: Ban the admin user
  const banReason = "Violated community guidelines - spam content";
  const banBody = {
    discussion_board_member_id: authorizedAdmin.id,
    ban_reason: banReason,
  } satisfies IDiscussionBoardBanRecord.IRequest;
  const banRecord =
    await api.functional.discussionBoard.admin.actors.ban.create(
      adminConnection,
      { body: banBody },
    );
  typia.assert(banRecord);
  // Step 3: Get ban status
  const statusResponse =
    await api.functional.discussionBoard.admin.actors.ban.status(
      adminConnection,
    );
  typia.assert(statusResponse);
  // Step 4: Validate ban status
  TestValidator.equals(
    "is_banned should be true",
    statusResponse.is_banned,
    true,
  );
  TestValidator.equals(
    "ban_reason matches",
    statusResponse.ban_reason,
    banReason,
  );
  TestValidator.predicate("banned_at is valid datetime", () => {
    try {
      new Date(statusResponse.banned_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals(
    "unbanned_at should be null",
    statusResponse.unbanned_at,
    null,
  );
}
