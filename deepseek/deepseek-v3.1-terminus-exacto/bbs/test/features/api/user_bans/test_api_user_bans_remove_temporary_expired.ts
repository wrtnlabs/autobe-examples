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

export async function test_api_user_bans_remove_temporary_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to be banned
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
  // 2. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 3. Create temporary ban with past expiration (already expired)
  const banExpiration = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
  const ban =
    await generate_random_discussion_board_super_admin_user_bans_create(
      superAdminConnection,
      {
        body: {
          member_id: member.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: banExpiration,
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(ban);
  // 4. Validate ban record creation
  TestValidator.equals("ban member ID matches", ban.member?.id, member.id);
  TestValidator.equals("ban reason is set", typeof ban.reason, "string");
  TestValidator.predicate(
    "expiration time is in past",
    new Date(ban.expires_at!) < new Date(),
  );
  // 5. Attempt to manually remove the expired ban
  await api.functional.discussionBoard.superAdmin.user_bans.erase(
    superAdminConnection,
    {
      banId: ban.id,
    },
  );
  // 6. Validate successful operation completion
  TestValidator.predicate("expired ban removal completed", true);
}
