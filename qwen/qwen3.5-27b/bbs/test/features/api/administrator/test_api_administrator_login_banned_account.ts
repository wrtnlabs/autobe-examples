import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_ban_records_create } from "../../../generate/generate_random_discussion_board_administrator_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test login failure for a banned administrator account.
 * 1. Register a new administrator account
 * 2. Create a ban record for this administrator using another admin
 * 3. Attempt to login with banned credentials
 * 4. Verify login is rejected due to ban status
 */
export async function test_api_administrator_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account that will be banned
  const newAdminConnection: api.IConnection = { host: connection.host };
  const newAdminEmail = typia.random<string & tags.Format<"email">>();
  const newAdminPassword = typia.random<string & tags.Format<"password">>();
  const newAdmin = await authorize_administrator_join(newAdminConnection, {
    body: {
      email: newAdminEmail,
      password: newAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(newAdmin);
  // 2. Create another administrator to ban the new admin
  const banningAdminConnection: api.IConnection = { host: connection.host };
  const banningAdmin = await authorize_administrator_join(
    banningAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(banningAdmin);
  // 3. Create ban record for the new administrator using utility function
  const banRecord =
    await generate_random_discussion_board_administrator_ban_records_create(
      banningAdminConnection,
      {
        body: {
          actor_type: "administrator",
          ban_reason: "Violation of community guidelines - spam content",
          administrator_id: newAdmin.id,
        },
      },
    );
  typia.assert(banRecord);
  // 4. Attempt to login with banned administrator credentials
  const bannedLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login rejected for banned administrator",
    async () => {
      await authorize_administrator_login(bannedLoginConnection, {
        body: {
          email: newAdminEmail,
          password: newAdminPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardAdministrator.ILogin,
      });
    },
  );
  // 5. Verify ban record exists and is active
  TestValidator.equals(
    "ban record actor type",
    banRecord.actor_type,
    "administrator",
  );
  TestValidator.predicate(
    "ban reason is provided",
    banRecord.ban_reason.length > 0,
  );
  TestValidator.equals(
    "ban is active (not unbanned)",
    banRecord.unbanned_at,
    null,
  );
}
