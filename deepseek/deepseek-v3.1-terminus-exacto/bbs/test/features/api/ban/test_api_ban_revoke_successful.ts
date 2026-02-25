import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_revoke_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin123",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create regular user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(user);
  // 3. Create active ban against the user
  const ban = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason:
          "Test ban for revocation workflow - this is a detailed reason exceeding 10 characters",
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban status should be active", ban.banStatus, "active");
  TestValidator.equals("banned user ID matches", ban.bannedUser.id, user.id);
  // 4. Verify user cannot login while banned
  await TestValidator.error(
    "banned user should not be able to login",
    async () => {
      await api.functional.discussionBoard.auth.user.login(
        { host: connection.host },
        {
          body: {
            email: user.email,
            password: "user123",
          } satisfies IDiscussionBoardUser.ILogin,
        },
      );
    },
  );
  // 5. Revoke the ban
  const revokedBan = await api.functional.discussionBoard.admin.bans.revoke(
    adminConnection,
    {
      banId: ban.id,
      body: {
        revoked_reason:
          "Test revocation - ban was issued for testing purposes only",
      } satisfies IDiscussionBoardBanRecord.IRevoke,
    },
  );
  typia.assert(revokedBan);
  // 6. Validate ban revocation details
  TestValidator.equals(
    "ban status should be revoked",
    revokedBan.banStatus,
    "revoked",
  );
  TestValidator.predicate(
    "revoked_at should be set",
    revokedBan.revokedAt !== null,
  );
  TestValidator.equals(
    "revocation reason should match",
    revokedBan.revocationReason,
    "Test revocation - ban was issued for testing purposes only",
  );
  TestValidator.notEquals(
    "revoked_at should be newer than ban creation",
    revokedBan.revokedAt,
    ban.createdAt,
  );
  // 7. Verify user can now authenticate successfully after revocation
  const revivedUserConnection: api.IConnection = { host: connection.host };
  const successLogin = await api.functional.discussionBoard.auth.user.login(
    revivedUserConnection,
    {
      body: {
        email: user.email,
        password: "user123",
      } satisfies IDiscussionBoardUser.ILogin,
    },
  );
  typia.assert(successLogin);
  TestValidator.equals(
    "user ID should match after successful login",
    successLogin.id,
    user.id,
  );
}
