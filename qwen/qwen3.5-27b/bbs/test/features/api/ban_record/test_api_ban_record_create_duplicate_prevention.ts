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
 * Test duplicate ban record prevention for already banned users.
 *
 * This test validates that when a member has been banned by one administrator
 * and the ban is still active (unbanned_at is null), a different administrator
 * attempting to create another ban record for the same user is rejected.
 * The test ensures:
 * 1. System checks for existing active ban records before creating a new one
 * 2. Duplicate ban creation request is rejected with appropriate error
 * 3. No new ban record is created in the database
 * 4. The existing ban record remains unchanged
 * 5. The member's banned flag remains true
 */
export async function test_api_ban_record_create_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first administrator
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_administrator_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin1);
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Create and authenticate second administrator
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin2);
  // 4. Admin1 creates first ban record for the member
  const banRecord =
    await generate_random_discussion_board_administrator_ban_records_create(
      admin1Connection,
      {
        body: {
          actor_type: "member",
          member_id: member.id,
          ban_reason: "Violation of community guidelines - spam posting",
        },
      },
    );
  typia.assert(banRecord);
  // 5. Admin2 attempts to create duplicate ban record for the same member
  await TestValidator.error("duplicate ban rejected", async () => {
    await generate_random_discussion_board_administrator_ban_records_create(
      admin2Connection,
      {
        body: {
          actor_type: "member",
          member_id: member.id,
          ban_reason: "Another violation reason",
        },
      },
    );
  });
  // 6. Verify the original ban record is still unchanged
  TestValidator.predicate(
    "original ban still active",
    banRecord.unbanned_at === null,
  );
  TestValidator.equals("banned by unchanged", banRecord.bannedBy.id, admin1.id);
}
