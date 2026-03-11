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

export async function test_api_ban_record_reason_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
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
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create ban record with initial reason
  const initialReason = RandomGenerator.paragraph({ sentences: 3 });
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          discussion_board_member_id: memberAuth.id,
          reason: initialReason,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Store original updated_at for comparison
  const originalUpdatedAt = banRecord.updated_at;
  // 4. Update ban record with new reason
  const newReason = RandomGenerator.paragraph({ sentences: 5 });
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banRecordId: banRecord.id,
        body: {
          reason: newReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBanRecord);
  // 5. Verify the response contains the updated reason
  TestValidator.equals("reason updated", updatedBanRecord.reason, newReason);
  // 6. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updatedBanRecord.updated_at,
  );
  // 7. Verify unbanned_at is still null (ban remains active)
  TestValidator.equals(
    "unbanned_at is null",
    updatedBanRecord.unbanned_at,
    null,
  );
  // 8. Verify member's ban_status remains 'banned'
  const memberSummary = updatedBanRecord.member;
  TestValidator.equals(
    "member ban_status is banned",
    memberSummary.ban_status,
    "banned",
  );
}
