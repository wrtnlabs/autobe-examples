import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

export async function test_api_superadmin_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two super admin accounts
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await api.functional.discussionBoard.auth.superAdmin.join(
    admin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(admin1);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await api.functional.discussionBoard.auth.superAdmin.join(
    admin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(admin2);
  // 2. Create a regular member account and store the password
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // 3. Ban the member account using admin1
  const banResult =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      admin1Connection,
      {
        body: {
          discussion_board_member_id: member.id,
          ban_reason: "Violation of community guidelines",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banResult);
  // 4. Verify the member is banned by attempting login (should fail)
  await TestValidator.error(
    "member login should fail when banned",
    async () => {
      await api.functional.discussionBoard.auth.member.login(memberConnection, {
        body: {
          email: member.email,
          password: memberPassword,
        } satisfies IDiscussionBoardMember.ILogin,
      });
    }
  );
  // 5. Have admin2 unban the member using DELETE /superAdmin/actors/{memberId}/ban
  await api.functional.discussionBoard.superAdmin.actors.ban.erase(
    admin2Connection,
    {
      actorId: member.id,
      body: {
        ban_reason: "Violation of community guidelines",
        unban_reason: "Ban period expired, user demonstrated good behavior",
      } satisfies IDiscussionBoardBanRecord.IUpdate,
    },
  );
  // 6. Verify the member can successfully login again with the original password after unban
  const reLoginConnection: api.IConnection = { host: connection.host };
  const reLogin = await api.functional.discussionBoard.auth.member.login(
    reLoginConnection,
    {
      body: {
        email: member.email,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(reLogin);
  // 7. Confirm the member's is_banned field is set to false through the re-login response
  TestValidator.equals(
    "member is_banned is false after unban",
    reLogin.is_banned,
    false,
  );
}