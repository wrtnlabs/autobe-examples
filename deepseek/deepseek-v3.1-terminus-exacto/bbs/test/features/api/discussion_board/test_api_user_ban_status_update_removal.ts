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

export async function test_api_user_ban_status_update_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  typia.assert(superAdmin);
  // 2. Create member account that will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(member);
  // 3. Create initial active ban record
  const banCreateBody = {
    member_id: member.id,
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  } satisfies IDiscussionBoardUserBan.ICreate;
  const initialBan =
    await api.functional.discussionBoard.superAdmin.user_bans.create(
      superAdminConnection,
      { body: banCreateBody },
    );
  typia.assert(initialBan);
  // Validate initial ban is active
  TestValidator.equals(
    "initial ban status should be active",
    initialBan.status,
    "active",
  );
  TestValidator.equals(
    "initial ban unbanned_at should be null",
    initialBan.unbanned_at,
    null,
  );
  // 4. Update ban status to 'removed' to lift the restriction
  const banUpdateBody = {
    status: "removed",
  } satisfies IDiscussionBoardUserBan.IUpdate;
  const updatedBan =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminConnection,
      {
        banId: initialBan.id,
        body: banUpdateBody,
      },
    );
  typia.assert(updatedBan);
  // 5. Validate ban status transition
  TestValidator.equals(
    "ban status should be updated to removed",
    updatedBan.status,
    "removed",
  );
  // 6. Verify removal timestamp is set
  TestValidator.predicate(
    "unbanned_at timestamp should be set when status changes to removed",
    () =>
      updatedBan.unbanned_at !== null && updatedBan.unbanned_at !== undefined,
  );
  // 7. Validate audit trail preservation
  TestValidator.equals(
    "ban id should remain the same",
    updatedBan.id,
    initialBan.id,
  );
  TestValidator.equals(
    "banned_at timestamp should remain unchanged",
    updatedBan.banned_at,
    initialBan.banned_at,
  );
  TestValidator.equals(
    "member id should remain unchanged",
    updatedBan.member?.id,
    member.id,
  );
  TestValidator.equals(
    "ban reason should remain unchanged",
    updatedBan.reason,
    initialBan.reason,
  );
  // 8. Validate timestamp updates
  TestValidator.predicate(
    "updated_at timestamp should change",
    () => updatedBan.updated_at !== initialBan.updated_at,
  );
}
