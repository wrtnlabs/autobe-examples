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

export async function test_api_user_ban_update_reason_correction(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // Create member account to be banned
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
    },
  });
  typia.assert(member);
  // Create initial ban record
  const initialBanReason = RandomGenerator.paragraph({ sentences: 1 });
  const initialBan =
    await generate_random_discussion_board_super_admin_user_bans_create(
      superAdminConnection,
      {
        body: {
          member_id: member.id,
          reason: initialBanReason,
          expires_at: null,
        },
      },
    );
  typia.assert(initialBan);
  // Update ban reason
  const updatedBanReason = RandomGenerator.paragraph({ sentences: 1 });
  const updatedBan =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminConnection,
      {
        banId: initialBan.id,
        body: {
          reason: updatedBanReason,
        } satisfies IDiscussionBoardUserBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Validate updated ban record
  TestValidator.equals("ban ID preservation", updatedBan.id, initialBan.id);
  TestValidator.equals(
    "ban reason update",
    updatedBan.reason,
    updatedBanReason,
  );
  TestValidator.notEquals(
    "updated_at timestamp change",
    updatedBan.updated_at,
    initialBan.updated_at,
  );
  TestValidator.equals(
    "banned_at timestamp preservation",
    updatedBan.banned_at,
    initialBan.banned_at,
  );
  TestValidator.equals(
    "status preservation",
    updatedBan.status,
    initialBan.status,
  );
  TestValidator.equals(
    "expires_at preservation",
    updatedBan.expires_at,
    initialBan.expires_at,
  );
  TestValidator.equals(
    "unbanned_at preservation",
    updatedBan.unbanned_at,
    initialBan.unbanned_at,
  );
  TestValidator.equals(
    "created_at timestamp preservation",
    updatedBan.created_at,
    initialBan.created_at,
  );
  TestValidator.predicate(
    "member reference existence",
    () => updatedBan.member !== undefined,
  );
  TestValidator.equals("member ID match", updatedBan.member!.id, member.id);
  TestValidator.predicate(
    "admin reference existence",
    () => updatedBan.admin !== undefined,
  );
  TestValidator.equals("admin ID match", updatedBan.admin!.id, superAdmin.id);
}
