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

export async function test_api_superadmin_user_ban_with_reason_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create target user to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Super admin bans the user with initial reason
  const banRequest: IDiscussionBoardBanRecord.IRequest = {
    discussion_board_member_id: member.id,
    ban_reason: "Initial ban for policy violation",
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardBanRecord.IRequest;
  const banRecord1 =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      { body: banRequest },
    );
  typia.assert(banRecord1);
  // Verify initial ban record
  TestValidator.equals(
    "initial ban reason",
    banRecord1.ban_reason,
    "Initial ban for policy violation",
  );
  const originalBannedAt = banRecord1.banned_at;
  const originalUpdatedAt = banRecord1.updated_at;
  // Wait a small amount of time to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Update ban reason with more detailed information
  const updatedBanRequest: IDiscussionBoardBanRecord.IRequest = {
    discussion_board_member_id: member.id,
    ban_reason:
      "Updated: Violated community guidelines section 3.2 regarding inappropriate content and spamming",
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardBanRecord.IRequest;
  const banRecord2 =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      { body: updatedBanRequest },
    );
  typia.assert(banRecord2);
  // 5. Verify ban record update
  TestValidator.equals(
    "updated ban reason",
    banRecord2.ban_reason,
    "Updated: Violated community guidelines section 3.2 regarding inappropriate content and spamming",
  );
  TestValidator.equals(
    "banned_at unchanged",
    banRecord2.banned_at,
    originalBannedAt,
  );
  TestValidator.predicate(
    "timestamp updated",
    () => banRecord2.updated_at > originalUpdatedAt,
  );
  TestValidator.predicate(
    "ban still active",
    () => banRecord2.deleted_at === null,
  );
}
