import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

export async function test_api_ban_reason_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 3. Administrator creates a ban against the member with initial reason
  const initialReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: memberAuth.id,
        reason: initialReason,
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. Administrator updates the ban reason with a new valid reason
  const updatedReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const updatedBan = await api.functional.discussionBoard.admin.bans.update(
    adminConnection,
    {
      banId: ban.id,
      body: {
        reason: updatedReason,
      } satisfies IDiscussionBoardBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // 5. Validate the update response
  // Verify the reason was updated
  TestValidator.equals("ban reason updated", updatedBan.reason, updatedReason);
  // Verify immutable fields are preserved
  TestValidator.equals(
    "member_id unchanged",
    updatedBan.member.id,
    memberAuth.id,
  );
  TestValidator.equals("admin_id unchanged", updatedBan.admin.id, adminAuth.id);
  TestValidator.equals(
    "banned_at unchanged",
    updatedBan.banned_at,
    ban.banned_at,
  );
  // Verify updated_at reflects the modification (should be same or later than original)
  TestValidator.predicate(
    "updated_at is valid date-time",
    updatedBan.updated_at >= ban.updated_at,
  );
  // Verify ban remains active (deleted_at is null)
  TestValidator.equals("ban still active", updatedBan.deleted_at, null);
  // Verify the ban ID remains the same
  TestValidator.equals("ban id unchanged", updatedBan.id, ban.id);
}
