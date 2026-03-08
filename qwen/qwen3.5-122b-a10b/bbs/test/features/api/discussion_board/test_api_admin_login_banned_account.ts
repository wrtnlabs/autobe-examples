import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials for first administrator (will be banned)
  const bannedAdminEmail = typia.random<string & tags.Format<"email">>();
  const bannedAdminPassword = RandomGenerator.alphaNumeric(16);
  const bannedAdminDisplayName = RandomGenerator.name();
  // 1. Create first administrator account that will be banned
  const bannedAdminConnection: api.IConnection = { host: connection.host };
  const bannedAdmin = await authorize_admin_join(bannedAdminConnection, {
    body: {
      email: bannedAdminEmail,
      password: bannedAdminPassword,
      display_name: bannedAdminDisplayName,
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(bannedAdmin);
  // Generate credentials for second administrator (will perform ban)
  const operatingAdminEmail = typia.random<string & tags.Format<"email">>();
  const operatingAdminPassword = RandomGenerator.alphaNumeric(16);
  const operatingAdminDisplayName = RandomGenerator.name();
  // 2. Create second administrator account to perform the ban operation
  const operatingAdminConnection: api.IConnection = { host: connection.host };
  const operatingAdmin = await authorize_admin_join(operatingAdminConnection, {
    body: {
      email: operatingAdminEmail,
      password: operatingAdminPassword,
      display_name: operatingAdminDisplayName,
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(operatingAdmin);
  // 3. Login as operatingAdmin to get authentication token for ban operation
  const banConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(banConnection, {
    body: {
      email: operatingAdminEmail,
      password: operatingAdminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 4. Ban the first administrator account
  const banRecord =
    await api.functional.discussionBoard.admin.admin.bans.create(
      banConnection,
      {
        body: {
          discussionBoardMemberId: bannedAdmin.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Attempt to login as banned admin with correct credentials - should fail with 403
  const bannedLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("banned admin cannot login", 403, async () => {
    await authorize_admin_login(bannedLoginConnection, {
      body: {
        email: bannedAdminEmail,
        password: bannedAdminPassword,
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  });
  // 6. Verify ban record structure
  TestValidator.equals(
    "ban record targets correct admin",
    banRecord.discussion_board_member_id,
    bannedAdmin.id,
  );
  TestValidator.predicate(
    "ban reason exists and is non-empty",
    banRecord.reason.length > 0,
  );
  TestValidator.predicate(
    "ban timestamp is valid",
    new Date(banRecord.banned_at) <= new Date(),
  );
  TestValidator.equals(
    "ban record has admin who created it",
    banRecord.discussion_board_admin_id,
    operatingAdmin.id,
  );
}
