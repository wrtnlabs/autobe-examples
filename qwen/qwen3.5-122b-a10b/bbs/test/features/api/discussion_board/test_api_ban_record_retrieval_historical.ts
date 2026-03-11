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
 * Test that an administrator can retrieve a historical (previously unbanned) ban record.
 * The test should verify that the response includes all ban record fields with
 * unbanned_at containing a valid timestamp, indicating the ban has been lifted.
 * The member information should still be accessible even though they are no longer banned,
 * demonstrating that ban records are preserved for audit trail purposes.
 * The response should include the complete history showing when the ban was imposed
 * (banned_at) and when it was lifted (unbanned_at), allowing administrators to review
 * moderation actions over time.
 */
export async function test_api_ban_record_retrieval_historical(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a ban record ID for retrieval
  const banRecordId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the ban record
  const banRecord = await api.functional.discussionBoard.admin.ban_records.at(
    adminConnection,
    {
      banRecordId,
    },
  );
  typia.assert(banRecord);
  // 4. Validate historical ban status (unbanned_at has a value)
  TestValidator.predicate(
    "historical ban has unbanned_at timestamp",
    banRecord.unbanned_at !== null,
  );
  TestValidator.predicate("ban record has reason", banRecord.reason.length > 0);
  TestValidator.predicate(
    "member information accessible",
    banRecord.member.id !== null && banRecord.member.id !== undefined,
  );
  TestValidator.predicate(
    "admin information accessible",
    banRecord.admin.id !== null && banRecord.admin.id !== undefined,
  );
}
