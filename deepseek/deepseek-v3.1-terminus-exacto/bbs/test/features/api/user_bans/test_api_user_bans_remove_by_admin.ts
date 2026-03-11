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

export async function test_api_user_bans_remove_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Store member password for later login attempt
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 2. Create administrator account for banning
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 3. Create ban record for the member
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          member_id: memberJoinResult.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: null,
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // Verify ban is active
  TestValidator.equals(
    "ban status should be active",
    banRecord.status,
    "active",
  );
  TestValidator.predicate(
    "unbanned_at should be null",
    banRecord.unbanned_at === null,
  );
  // 4. Remove the ban
  await api.functional.discussionBoard.admin.user_bans.erase(adminConnection, {
    banId: banRecord.id,
  });
  // Verify member can log in again with original password
  const freshMemberConnection: api.IConnection = { host: connection.host };
  const memberLoginResult = await authorize_member_login(
    freshMemberConnection,
    {
      body: {
        email: memberJoinResult.email,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(memberLoginResult);
  TestValidator.equals(
    "member should be able to login after ban removal",
    memberLoginResult.id,
    memberJoinResult.id,
  );
  TestValidator.equals(
    "member should not be banned after removal",
    memberLoginResult.is_banned,
    false,
  );
}
