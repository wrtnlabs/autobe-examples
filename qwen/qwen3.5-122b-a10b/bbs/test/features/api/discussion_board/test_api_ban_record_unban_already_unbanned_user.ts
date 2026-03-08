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

/**
 * Test attempting to unban an already unbanned user fails.
 * 1. Create admin account and authenticate
 * 2. Create member account
 * 3. Create ban record for member
 * 4. Successfully unban user once
 * 5. Attempt to unban again - should fail
 * 6. Verify error indicates ban is not active
 */
export async function test_api_ban_record_unban_already_unbanned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Create ban record for member
  const banRecord =
    await generate_random_discussion_board_admin_admin_bans_create(
      adminConnection,
      {
        body: {
          discussionBoardMemberId: member.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Successfully unban user once
  const firstUnban =
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          unbanned_at: new Date().toISOString(),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(firstUnban);
  // Verify unbanned_at is now set
  TestValidator.predicate(
    "unbanned_at is set",
    firstUnban.unbanned_at !== null,
  );
  // 5-6. Attempt to unban again - should fail
  await TestValidator.error("cannot unban already unbanned user", async () => {
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          unbanned_at: new Date().toISOString(),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  });
}
