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

export async function test_api_ban_record_create_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the success path for banning an administrator account.
   * An authenticated administrator bans another administrator who violated platform policies.
   * Validates the polymorphic ownership pattern for ban records.
   */
  // 1. Setup: Create and authenticate the banning administrator
  const banningAdminConnection: api.IConnection = { host: connection.host };
  const banningAdmin = await authorize_administrator_join(
    banningAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(banningAdmin);
  // 2. Setup: Create and authenticate the target administrator (to be banned)
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_administrator_join(
    targetAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(targetAdmin);
  // 3. Execute: Create ban record using banning admin's connection
  const banRecord =
    await api.functional.discussionBoard.administrator.banRecords.create(
      banningAdminConnection,
      {
        body: {
          actor_type: "administrator",
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          administrator_id: targetAdmin.id,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Validate: Check ban record structure and business logic
  TestValidator.equals(
    "actor type is administrator",
    banRecord.actor_type,
    "administrator",
  );
  TestValidator.predicate(
    "banned_at is recorded",
    banRecord.banned_at !== null,
  );
  TestValidator.equals("unbanned_at is null", banRecord.unbanned_at, null);
  TestValidator.equals(
    "bannedBy is the banning admin",
    banRecord.bannedBy.id,
    banningAdmin.id,
  );
  TestValidator.equals(
    "bannedUser id matches target",
    banRecord.bannedUser.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "bannedUser email matches target",
    banRecord.bannedUser.email,
    targetAdmin.email,
  );
}
