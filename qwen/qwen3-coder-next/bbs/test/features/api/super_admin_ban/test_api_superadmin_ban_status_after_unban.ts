import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_ban_status_after_unban(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and register new super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const registerEmail =
    "test_superadmin_" + RandomGenerator.alphaNumeric(6) + "@test.com";
  const registerPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await authorize_super_admin_join(adminConnection, {
    body: {
      email: registerEmail,
      password: registerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // Step 2: Login as super admin
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedAdmin = await authorize_super_admin_login(loginConnection, {
    body: {
      email: registerEmail,
      password: registerPassword,
    },
  });
  typia.assert(loggedAdmin);
  // Step 3: Create a ban record for the super admin
  const banRequest = {
    discussion_board_member_id: loggedAdmin.id,
    ban_reason: "Test ban reason - temporary suspension",
  } satisfies IDiscussionBoardBanRecord.IRequest;
  const banRecord =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      loginConnection,
      {
        body: banRequest,
      },
    );
  typia.assert(banRecord);
  // Verify initial ban state
  const initialStatus =
    await api.functional.discussionBoard.superAdmin.actors.ban.status(
      loginConnection,
    );
  typia.assert(initialStatus);
  TestValidator.equals(
    "is_banned should be true initially",
    initialStatus.is_banned,
    true,
  );
  TestValidator.equals(
    "ban_reason matches",
    initialStatus.ban_reason,
    "Test ban reason - temporary suspension",
  );
  TestValidator.predicate(
    "banned_at exists",
    initialStatus.banned_at !== null && initialStatus.banned_at !== undefined,
  );
  TestValidator.equals(
    "unbanned_at should be null initially",
    initialStatus.unbanned_at,
    null,
  );
  // Step 4: Unban the super admin
  const unbanBody = {
    ban_reason: "Test ban reason - temporary suspension",
    unban_reason: "Ban lifted after review",
  } satisfies IDiscussionBoardBanRecord.IUpdate;
  const unbanRecord =
    await api.functional.discussionBoard.superAdmin.bans.update(
      loginConnection,
      {
        banId: banRecord.id,
        body: unbanBody,
      },
    );
  typia.assert(unbanRecord);
  // Step 5: Retrieve and validate ban status after unban
  const finalStatus =
    await api.functional.discussionBoard.superAdmin.actors.ban.status(
      loginConnection,
    );
  typia.assert(finalStatus);
  // Validation: is_banned should be false after unban
  TestValidator.equals(
    "is_banned should be false after unban",
    finalStatus.is_banned,
    false,
  );
  // Validation: ban_reason should contain the original ban reason
  TestValidator.equals(
    "ban_reason contains original reason",
    finalStatus.ban_reason,
    "Test ban reason - temporary suspension",
  );
  // Validation: banned_at should exist
  TestValidator.predicate(
    "banned_at should exist",
    finalStatus.banned_at !== null && finalStatus.banned_at !== undefined,
  );
  // Validation: unbanned_at should be present and not null
  TestValidator.predicate(
    "unbanned_at should exist",
    finalStatus.unbanned_at !== null && finalStatus.unbanned_at !== undefined,
  );
  // Validation: unban_reason should be present
  TestValidator.equals(
    "unban_reason should be present",
    unbanRecord.unban_reason,
    "Ban lifted after review",
  );
}
