import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_bans_remove_active_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create target member to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      ...memberCredentials,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoin);
  // 2. Authenticate as super admin using login endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  // First join the super admin
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminCredentials satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Then login with the same credentials
  const superAdminLogin = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: {
        ...superAdminCredentials,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(superAdminLogin);
  // 3. Create active ban record
  const banCreateBody = {
    member_id: memberJoin.id,
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    expires_at: null,
  } satisfies IDiscussionBoardUserBan.ICreate;
  const banRecord =
    await generate_random_discussion_board_super_admin_user_bans_create(
      superAdminConnection,
      { body: banCreateBody },
    );
  typia.assert(banRecord);
  // Verify ban is active initially
  TestValidator.equals(
    "ban status should be active initially",
    banRecord.status,
    "active",
  );
  TestValidator.predicate(
    "unbanned_at should be null initially",
    banRecord.unbanned_at === null,
  );
  // 4. Remove the ban - this is the main operation being tested
  await api.functional.discussionBoard.superAdmin.user_bans.erase(
    superAdminConnection,
    { banId: banRecord.id },
  );
  // 5. Since the erase endpoint returns void and there's no GET endpoint to retrieve ban status,
  // we validate success by ensuring no error was thrown and test edge cases
  // Test edge case: Attempt to remove non-existent ban
  await TestValidator.error(
    "should error when removing non-existent ban",
    async () => {
      await api.functional.discussionBoard.superAdmin.user_bans.erase(
        superAdminConnection,
        { banId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
  // Test edge case: Attempt to remove already removed ban
  await TestValidator.error(
    "should error when removing already removed ban",
    async () => {
      await api.functional.discussionBoard.superAdmin.user_bans.erase(
        superAdminConnection,
        { banId: banRecord.id },
      );
    },
  );
  // 6. Validate that the user can log in again (functional test of ban removal)
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberCredentials.email,
      password: memberCredentials.password,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  // Additional validation
  TestValidator.equals(
    "user ID should match after ban removal",
    memberLogin.id,
    memberJoin.id,
  );
  TestValidator.equals(
    "user email should match after ban removal",
    memberLogin.email,
    memberCredentials.email,
  );
  TestValidator.predicate(
    "user should not be banned after removal",
    memberLogin.is_banned === false,
  );
}