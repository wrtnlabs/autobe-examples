import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_ban_records_create } from "../../../generate/generate_random_discussion_board_administrator_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test retrieving a ban record where a member was banned by an administrator.
 * 1. Administrator registers and logs in
 * 2. Member registers (will be banned)
 * 3. Administrator creates ban record for the member
 * 4. Retrieve the ban record by ID
 * 5. Validate ban record details, bannedBy administrator, and bannedUser member
 */
export async function test_api_ban_record_retrieve_member_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(adminAuth);
  // 2. Member setup - register the member that will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(memberAuth);
  // 3. Administrator creates ban record for the member
  const banRecord =
    await generate_random_discussion_board_administrator_ban_records_create(
      adminConnection,
      {
        body: {
          actor_type: "member",
          member_id: memberAuth.id,
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(banRecord);
  // 4. Retrieve the ban record by ID
  const retrievedBanRecord =
    await api.functional.discussionBoard.administrator.banRecords.at(
      adminConnection,
      {
        banRecordId: banRecord.id,
      },
    );
  typia.assert(retrievedBanRecord);
  // 5. Validate ban record details
  TestValidator.equals(
    "ban record ID matches",
    retrievedBanRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "actor type is member",
    retrievedBanRecord.actor_type,
    "member",
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedBanRecord.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.predicate(
    "banned_at is valid datetime",
    retrievedBanRecord.banned_at !== null,
  );
  TestValidator.equals(
    "unbanned_at is null (ban active)",
    retrievedBanRecord.unbanned_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    retrievedBanRecord.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    retrievedBanRecord.updated_at !== null,
  );
  // 6. Validate bannedBy administrator
  TestValidator.equals(
    "bannedBy administrator ID matches",
    retrievedBanRecord.bannedBy.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "bannedBy administrator email matches",
    retrievedBanRecord.bannedBy.email,
    adminAuth.email,
  );
  TestValidator.equals(
    "bannedBy administrator display_name matches",
    retrievedBanRecord.bannedBy.display_name,
    adminAuth.display_name,
  );
  TestValidator.predicate(
    "bannedBy has valid grade",
    retrievedBanRecord.bannedBy.grade !== null,
  );
  // 7. Validate bannedUser member
  TestValidator.equals(
    "bannedUser member ID matches",
    retrievedBanRecord.bannedUser.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "bannedUser member email matches",
    retrievedBanRecord.bannedUser.email,
    (memberAuth as any).email,
  );
  TestValidator.equals(
    "bannedUser member display_name matches",
    retrievedBanRecord.bannedUser.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "bannedUser is actually banned",
    (retrievedBanRecord.bannedUser as any).banned,
    true,
  );
}