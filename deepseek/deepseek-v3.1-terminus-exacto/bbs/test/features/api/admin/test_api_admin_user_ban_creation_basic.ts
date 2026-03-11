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

export async function test_api_admin_user_ban_creation_basic(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: typia.random<string>(),
        bio: typia.random<string | null>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 3: Create ban using administrator
  const banReason = typia.random<string>();
  const ban = await generate_random_discussion_board_admin_user_bans_create(
    adminConnection,
    {
      body: {
        member_id: member.id,
        reason: banReason,
        expires_at: null,
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Step 4: Validate ban response
  TestValidator.equals("ban status should be active", ban.status, "active");
  TestValidator.equals("member ID should match", ban.member?.id, member.id);
  TestValidator.equals("admin ID should match", ban.admin?.id, admin.id);
  TestValidator.equals("ban reason should match", ban.reason, banReason);
  TestValidator.predicate(
    "banned_at should be set",
    ban.banned_at !== undefined,
  );
  TestValidator.equals("expires_at should be null", ban.expires_at, null);
  TestValidator.equals("unbanned_at should be null", ban.unbanned_at, null);
  TestValidator.predicate(
    "created_at should be set",
    ban.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be set",
    ban.updated_at !== undefined,
  );
}
