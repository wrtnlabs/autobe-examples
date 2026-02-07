import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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

/**
 * Test deletion of an expired ban record.
 * 1. Create administrator account and authenticate
 * 2. Create an expired ban record for deletion testing
 * 3. Delete the expired ban record
 * 4. Verify deletion returns complete record information
 */
export async function test_api_admin_ban_record_deletion_expired_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create expired ban record using utility function
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_status: "expired",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Delete the expired ban record
  const deletedRecord =
    await api.functional.discussionBoard.admin.ban_records.erase(
      adminConnection,
      {
        banRecordId: banRecord.id,
      },
    );
  typia.assert(deletedRecord);
  // 4. Validate deletion returned complete record information
  TestValidator.equals("ban record ID matches", deletedRecord.id, banRecord.id);
  TestValidator.equals(
    "ban reason matches",
    deletedRecord.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.equals(
    "ban status remains expired",
    deletedRecord.ban_status,
    "expired",
  );
  TestValidator.equals(
    "created_at timestamp matches",
    deletedRecord.created_at,
    banRecord.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    deletedRecord.updated_at,
    banRecord.updated_at,
  );
}
