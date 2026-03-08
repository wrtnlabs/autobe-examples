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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_member_cannot_ban_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (attacker - non-administrator)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create target member account (victim)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberPassword = RandomGenerator.alphaNumeric(16);
  const targetMemberAuth = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: targetMemberPassword,
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(targetMemberAuth);
  // 3. Verify target member's ban status is 'active' before ban attempt
  TestValidator.equals(
    "target member ban status is active",
    targetMemberAuth.banStatus,
    "active",
  );
  // 4. Attempt to ban target member using member connection (should fail with 403)
  await TestValidator.httpError(
    "member cannot ban users - forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.admin.admin.bans.create(
        memberConnection,
        {
          body: {
            discussionBoardMemberId: targetMemberAuth.id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardBanRecord.ICreate,
        },
      );
    },
  );
  // 5. Verify target member can still login (ban status unchanged)
  const freshTargetConnection: api.IConnection = { host: connection.host };
  const freshTargetAuth = await authorize_member_login(freshTargetConnection, {
    body: {
      email: targetMemberAuth.email,
      password: targetMemberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(freshTargetAuth);
  TestValidator.equals(
    "target member ban status still active after failed ban",
    freshTargetAuth.banStatus,
    "active",
  );
}
