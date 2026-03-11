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

export async function test_api_user_ban_superadmin_temporary(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account
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
  // Create temporary ban with future expiration date
  const banExpiration = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban =
    await generate_random_discussion_board_super_admin_user_bans_create(
      superAdminConnection,
      {
        body: {
          member_id: member.id,
          reason: banReason,
          expires_at: banExpiration,
        },
      },
    );
  typia.assert(ban);
  // Validate ban response
  TestValidator.equals("ban status should be active", ban.status, "active");
  TestValidator.equals("ban reason should match", ban.reason, banReason);
  TestValidator.equals(
    "ban expiration should match",
    ban.expires_at,
    banExpiration,
  );
  TestValidator.predicate(
    "banned_at should be valid timestamp",
    () => new Date(ban.banned_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at should be valid timestamp",
    () => new Date(ban.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    () => new Date(ban.updated_at).getTime() > 0,
  );
  // Validate member association
  TestValidator.equals(
    "banned member ID should match",
    ban.member?.id,
    member.id,
  );
  TestValidator.equals(
    "banned member display name should match",
    ban.member?.display_name,
    member.display_name,
  );
  // Validate admin association
  TestValidator.equals(
    "banning admin ID should match",
    ban.admin?.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "banning admin email should match",
    ban.admin?.email,
    superAdmin.email,
  );
  TestValidator.equals(
    "banning admin grade should be super",
    ban.admin?.admin_grade,
    "super",
  );
}
