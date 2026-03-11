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
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test the primary success path for creating a user ban record by an administrator.
 * The scenario verifies that:
 * 1) An administrator successfully authenticates via join
 * 2) A target member account exists in the system
 * 3) The administrator creates a ban record with a valid member ID and non-empty reason
 * 4) The response contains the complete ban record with auto-generated fields (id, banned_at, admin attribution)
 * 5) The banned member's account status is immediately updated to 'banned'
 * 6) The ban reason is recorded and visible in the ban record
 */
export async function test_api_ban_record_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create target member account that will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: memberDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Verify member is initially active
  TestValidator.equals(
    "member ban status initially active",
    memberAuth.ban_status,
    "active",
  );
  // 3. Create ban record by administrator
  const banReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const banRecord =
    await api.functional.discussionBoard.admin.ban_records.create(
      adminConnection,
      {
        body: {
          discussion_board_member_id: memberAuth.id,
          reason: banReason,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Validate ban record response structure
  TestValidator.equals(
    "ban record has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      banRecord.id,
    ),
    true,
  );
  TestValidator.equals(
    "ban record member ID matches",
    banRecord.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "ban record admin ID matches",
    banRecord.admin.id,
    adminAuth.id,
  );
  TestValidator.equals("ban reason matches input", banRecord.reason, banReason);
  TestValidator.predicate(
    "banned_at is valid datetime",
    banRecord.banned_at.length > 0,
  );
  TestValidator.equals(
    "unbanned_at is null for active ban",
    banRecord.unbanned_at,
    null,
  );
  // 5. Verify member's ban status is updated
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  TestValidator.equals(
    "member ban status updated to banned",
    memberLogin.ban_status,
    "banned",
  );
  TestValidator.equals(
    "member ban reason recorded",
    memberLogin.ban_reason,
    banReason,
  );
}
