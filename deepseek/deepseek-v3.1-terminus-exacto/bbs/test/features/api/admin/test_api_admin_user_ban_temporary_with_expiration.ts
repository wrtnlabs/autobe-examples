import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_admin_user_ban_temporary_with_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Re-authenticate admin to ensure proper authorization
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(authenticatedAdminConnection, {
    body: adminCredentials satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Create temporary ban with future expiration
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const ban = await generate_random_discussion_board_admin_user_bans_create(
    authenticatedAdminConnection,
    {
      body: {
        member_id: member.id,
        reason: banReason,
        expires_at: expiresAt,
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. Validate ban response
  TestValidator.equals("ban status should be active", ban.status, "active");
  TestValidator.equals("ban reason should match", ban.reason, banReason);
  TestValidator.equals(
    "expiration date should match",
    ban.expires_at,
    expiresAt,
  );
  TestValidator.equals("member ID should match", ban.member?.id, member.id);
  // Validate timestamps with tolerance
  const bannedAtTime = new Date(ban.banned_at).getTime();
  const currentTime = Date.now();
  TestValidator.predicate(
    "banned_at should be recent",
    Math.abs(currentTime - bannedAtTime) < 300000,
  ); // within 5 minutes
  const expiresAtTime = new Date(ban.expires_at!).getTime();
  TestValidator.predicate(
    "expires_at should be in the future",
    expiresAtTime > currentTime,
  );
  // Validate admin information
  TestValidator.predicate(
    "admin summary should be populated",
    ban.admin !== undefined,
  );
  TestValidator.equals(
    "admin email should match",
    ban.admin?.email,
    admin.email,
  );
}
