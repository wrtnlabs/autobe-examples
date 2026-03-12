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
import { generate_random_discussion_board_administrator_ban_records_create } from "../../../generate/generate_random_discussion_board_administrator_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test retrieving a ban record where an administrator was banned by a super administrator.
 * Verifies that the response includes ban record details, the bannedBy administrator object
 * showing the super administrator who imposed the ban, and the bannedUser administrator object
 * with the banned administrator's details including their grade.
 */
export async function test_api_ban_record_retrieve_administrator_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account (will be banned)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(regularAdmin);
  // 3. Create ban record using super administrator
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const banRecord =
    await api.functional.discussionBoard.administrator.banRecords.create(
      superAdminConnection,
      {
        body: {
          actor_type: "administrator",
          ban_reason: banReason,
          administrator_id: regularAdmin.id,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Retrieve the ban record
  const retrievedBanRecord =
    await api.functional.discussionBoard.administrator.banRecords.at(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
      },
    );
  typia.assert(retrievedBanRecord);
  // 5. Validate ban record details
  TestValidator.equals(
    "actor_type is administrator",
    retrievedBanRecord.actor_type,
    "administrator",
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedBanRecord.ban_reason,
    banReason,
  );
  TestValidator.predicate(
    "banned_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedBanRecord.banned_at,
    ),
  );
  TestValidator.predicate(
    "unbanned_at is null (active ban)",
    retrievedBanRecord.unbanned_at === null,
  );
  // 6. Validate bannedBy (super administrator who imposed the ban)
  TestValidator.equals(
    "bannedBy id matches super admin",
    retrievedBanRecord.bannedBy.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "bannedBy email matches super admin",
    retrievedBanRecord.bannedBy.email,
    superAdmin.email,
  );
  TestValidator.equals(
    "bannedBy grade is super",
    retrievedBanRecord.bannedBy.grade,
    "super",
  );
  // 7. Validate bannedUser (regular administrator who was banned)
  TestValidator.predicate(
    "bannedUser is administrator type",
    "grade" in retrievedBanRecord.bannedUser,
  );
  const bannedAdmin =
    retrievedBanRecord.bannedUser as IDiscussionBoardAdministrator.ISummary;
  TestValidator.equals(
    "bannedUser id matches regular admin",
    bannedAdmin.id,
    regularAdmin.id,
  );
  TestValidator.equals(
    "bannedUser email matches regular admin",
    bannedAdmin.email,
    regularAdmin.email,
  );
  TestValidator.equals(
    "bannedUser grade is regular",
    bannedAdmin.grade,
    "regular",
  );
}
