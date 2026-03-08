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

export async function test_api_ban_record_retrieval_by_admin(
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a ban record for a member
  const banRecord =
    await generate_random_discussion_board_admin_admin_bans_create(
      adminConnection,
      {
        body: {
          discussionBoardMemberId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Retrieve the ban record by its ID
  const retrievedBanRecord =
    await api.functional.discussionBoard.admin.ban_records.at(adminConnection, {
      banId: banRecord.id,
    });
  typia.assert(retrievedBanRecord);
  // 4. Validate the retrieved ban record structure and content
  TestValidator.equals(
    "ban record ID matches",
    retrievedBanRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "banned member ID matches",
    retrievedBanRecord.discussion_board_member_id,
    banRecord.discussion_board_member_id,
  );
  TestValidator.equals(
    "admin ID matches",
    retrievedBanRecord.discussion_board_admin_id,
    banRecord.discussion_board_admin_id,
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedBanRecord.reason,
    banRecord.reason,
  );
  TestValidator.equals(
    "banned_at timestamp matches",
    retrievedBanRecord.banned_at,
    banRecord.banned_at,
  );
  TestValidator.predicate(
    "unbanned_at is null for active ban",
    retrievedBanRecord.unbanned_at === null,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    retrievedBanRecord.created_at,
    banRecord.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedBanRecord.updated_at,
    banRecord.updated_at,
  );
  // Validate banned user summary
  TestValidator.predicate(
    "banned user has display name",
    retrievedBanRecord.discussionBoardMember.displayName.length > 0,
  );
  TestValidator.predicate(
    "banned user has article count",
    retrievedBanRecord.discussionBoardMember.articleCount >= 0,
  );
  TestValidator.predicate(
    "banned user has comment count",
    retrievedBanRecord.discussionBoardMember.commentCount >= 0,
  );
  // Validate administrator summary
  TestValidator.predicate(
    "admin has display name",
    retrievedBanRecord.discussionBoardAdmin.display_name.length > 0,
  );
  TestValidator.predicate(
    "admin has grade",
    retrievedBanRecord.discussionBoardAdmin.grade.length > 0,
  );
}
