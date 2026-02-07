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

export async function test_api_ban_record_update_reason_extension(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create initial ban record
  const initialBan =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(initialBan);
  // Store original timestamps for comparison
  const originalCreatedAt = initialBan.created_at;
  const originalUpdatedAt = initialBan.updated_at;
  // Update ban record with extended duration and new reason
  const updatedBan =
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banRecordId: initialBan.id,
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<31> & tags.Maximum<365>
          >(),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Validate updates
  TestValidator.equals("ban record ID unchanged", updatedBan.id, initialBan.id);
  TestValidator.notEquals(
    "ban reason updated",
    updatedBan.ban_reason,
    initialBan.ban_reason,
  );
  TestValidator.notEquals(
    "ban duration updated",
    updatedBan.ban_duration_days,
    initialBan.ban_duration_days,
  );
  TestValidator.equals(
    "ban status remains active",
    updatedBan.ban_status,
    "active",
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBan.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedBan.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "expires_at is recalculated",
    updatedBan.expires_at !== null,
  );
  TestValidator.predicate(
    "revoked_at remains null",
    updatedBan.revoked_at === null,
  );
  TestValidator.predicate(
    "revoked_reason remains null",
    updatedBan.revoked_reason === null,
  );
}
