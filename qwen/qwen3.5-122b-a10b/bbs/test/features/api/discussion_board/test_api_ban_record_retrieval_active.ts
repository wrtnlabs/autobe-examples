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

/**
 * Test administrator can retrieve active ban record details.
 *
 * This test verifies:
 * 1. Admin authentication works for ban record access
 * 2. Ban record retrieval returns complete data structure
 * 3. Active ban has unbanned_at as null
 * 4. Member's ban_status reflects 'banned' status
 * 5. All JOIN data from discussion_board_members and discussion_board_admins is included
 */
export async function test_api_ban_record_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "regular",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve a ban record (in simulation mode, generates random valid data)
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  const banRecord = await api.functional.discussionBoard.admin.ban_records.at(
    adminConnection,
    {
      banRecordId,
    },
  );
  typia.assert(banRecord);
  // 3. Validate business logic: This is an ACTIVE ban (unbanned_at is null)
  TestValidator.equals(
    "active ban has null unbanned_at",
    banRecord.unbanned_at,
    null,
  );
  // 4. Validate member's ban_status reflects 'banned'
  TestValidator.equals(
    "member ban_status is banned",
    banRecord.member.ban_status,
    "banned",
  );
  // 5. Validate ban record has required fields with proper values
  TestValidator.predicate(
    "ban reason is not empty",
    banRecord.reason.length > 0,
  );
  TestValidator.predicate("banned_at is set", banRecord.banned_at !== null);
  TestValidator.equals(
    "deleted_at is null for active record",
    banRecord.deleted_at,
    null,
  );
  // 6. Validate JOIN data exists (member and admin references)
  TestValidator.predicate(
    "member has ID",
    banRecord.member.id !== null && banRecord.member.id !== undefined,
  );
  TestValidator.predicate(
    "admin has ID",
    banRecord.admin.id !== null && banRecord.admin.id !== undefined,
  );
}
