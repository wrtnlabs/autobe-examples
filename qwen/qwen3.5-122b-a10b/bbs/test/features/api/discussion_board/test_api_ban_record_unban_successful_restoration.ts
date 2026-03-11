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
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_record_unban_successful_restoration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Create a member to ban
  // Note: Member creation would typically happen through a separate member join endpoint
  // For this test, we'll use a generated UUID assuming the member exists in the system
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create ban record for the member
  const banRecordCreate =
    await api.functional.discussionBoard.admin.ban_records.create(
      adminConnection,
      {
        body: {
          discussion_board_member_id: memberId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecordCreate);
  // Verify ban record is active (unbanned_at is null)
  TestValidator.predicate(
    "ban is active",
    banRecordCreate.unbanned_at === null,
  );
  TestValidator.equals(
    "member is banned",
    banRecordCreate.member.ban_status,
    "banned",
  );
  // 4. Unban the member using PATCH endpoint
  const unbanResult =
    await api.functional.discussionBoard.admin.ban_records.unban(
      adminConnection,
      {
        banRecordId: banRecordCreate.id,
        body: {} satisfies IDiscussionBoardBanRecord.IUnban,
      },
    );
  typia.assert(unbanResult);
  // 5. Verify unban was successful - ban record now has unbanned_at timestamp
  TestValidator.predicate(
    "unban timestamp exists",
    unbanResult.unbanned_at !== null,
  );
  TestValidator.predicate(
    "unban timestamp is valid date-time",
    !isNaN(Date.parse(unbanResult.unbanned_at!)),
  );
  // 6. Verify member status changed to active
  TestValidator.equals(
    "member status is active",
    unbanResult.member.ban_status,
    "active",
  );
  // 7. Verify ban record integrity
  TestValidator.equals(
    "ban record ID preserved",
    unbanResult.id,
    banRecordCreate.id,
  );
  TestValidator.equals(
    "member ID preserved",
    unbanResult.member.id,
    banRecordCreate.member.id,
  );
  TestValidator.equals(
    "ban reason preserved",
    unbanResult.reason,
    banRecordCreate.reason,
  );
  TestValidator.predicate(
    "banned_at timestamp exists",
    !isNaN(Date.parse(banRecordCreate.banned_at)),
  );
}
