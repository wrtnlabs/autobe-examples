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

export async function test_api_ban_record_partial_update_status_only(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Create initial ban record with status 'active'
  const initialBanRecord =
    await api.functional.discussionBoard.admin.ban_records.create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(initialBanRecord);
  // Store original values for comparison
  const originalBanReason = initialBanRecord.ban_reason;
  const originalBanDurationDays = initialBanRecord.ban_duration_days;
  const originalExpiresAt = initialBanRecord.expires_at;
  const originalRevokedAt = initialBanRecord.revoked_at;
  const originalRevokedReason = initialBanRecord.revoked_reason;
  const originalCreatedAt = initialBanRecord.created_at;
  // Update only the ban_status field to 'expired'
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banRecordId: initialBanRecord.id,
        body: {
          ban_status: "expired",
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBanRecord);
  // Validate that only ban_status was updated
  TestValidator.equals(
    "ban status updated",
    updatedBanRecord.ban_status,
    "expired",
  );
  TestValidator.equals(
    "ban reason unchanged",
    updatedBanRecord.ban_reason,
    originalBanReason,
  );
  TestValidator.equals(
    "ban duration unchanged",
    updatedBanRecord.ban_duration_days,
    originalBanDurationDays,
  );
  TestValidator.equals(
    "expires_at unchanged",
    updatedBanRecord.expires_at,
    originalExpiresAt,
  );
  TestValidator.equals(
    "revoked_at unchanged",
    updatedBanRecord.revoked_at,
    originalRevokedAt,
  );
  TestValidator.equals(
    "revoked_reason unchanged",
    updatedBanRecord.revoked_reason,
    originalRevokedReason,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBanRecord.created_at,
    originalCreatedAt,
  );
  // Validate that updated_at timestamp reflects the modification
  TestValidator.notEquals(
    "updated_at changed",
    updatedBanRecord.updated_at,
    initialBanRecord.updated_at,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(updatedBanRecord.updated_at).getTime() >
      new Date(initialBanRecord.updated_at).getTime(),
  );
}
