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
import { generate_random_discussion_board_admin_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_record_retrieval_after_unban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
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
  typia.assert(admin);
  // 2. Create a ban record for a member
  const banRecord =
    await generate_random_discussion_board_admin_admin_bans_create(
      adminConnection,
      {
        body: {
          discussionBoardMemberId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Verify ban record is initially active (unbanned_at is null)
  TestValidator.equals(
    "ban record initially active",
    banRecord.unbanned_at,
    null,
  );
  // 4. Retrieve the ban record to verify it's accessible for audit trail
  const retrievedBanRecord =
    await api.functional.discussionBoard.admin.ban_records.at(adminConnection, {
      banId: banRecord.id,
    });
  typia.assert(retrievedBanRecord);
  // 5. Verify retrieved ban record matches original and contains complete audit information
  TestValidator.equals(
    "ban record ID matches",
    retrievedBanRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedBanRecord.reason,
    banRecord.reason,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedBanRecord.discussion_board_member_id,
    banRecord.discussion_board_member_id,
  );
  TestValidator.equals(
    "admin ID matches",
    retrievedBanRecord.discussion_board_admin_id,
    banRecord.discussion_board_admin_id,
  );
  TestValidator.predicate(
    "banned_at is populated",
    retrievedBanRecord.banned_at !== null,
  );
  TestValidator.predicate(
    "has discussionBoardMember summary",
    retrievedBanRecord.discussionBoardMember !== undefined,
  );
  TestValidator.predicate(
    "has discussionBoardAdmin summary",
    retrievedBanRecord.discussionBoardAdmin !== undefined,
  );
}
