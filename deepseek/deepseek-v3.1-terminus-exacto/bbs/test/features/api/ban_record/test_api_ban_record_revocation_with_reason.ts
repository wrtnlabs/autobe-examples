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

export async function test_api_ban_record_revocation_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
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
  // 2. Create an active ban record
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Revoke the ban record with a reason
  const revocationReason = RandomGenerator.paragraph({ sentences: 3 });
  // Check if utility function exists for update endpoint
  // Since no utility function is provided for the update endpoint in the available utilities,
  // we must use the SDK function directly
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banRecordId: banRecord.id,
        body: {
          ban_status: "revoked",
          revoked_reason: revocationReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBanRecord);
  // 4. Validate the revocation
  TestValidator.equals(
    "ban status should be revoked",
    updatedBanRecord.ban_status,
    "revoked",
  );
  TestValidator.notEquals(
    "revoked_at should be set",
    updatedBanRecord.revoked_at,
    null,
  );
  TestValidator.equals(
    "revoked_reason should match",
    updatedBanRecord.revoked_reason,
    revocationReason,
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedBanRecord.updated_at) > new Date(banRecord.created_at),
  );
  // Validate revoked_at is a valid ISO date-time
  if (updatedBanRecord.revoked_at !== null) {
    TestValidator.predicate("revoked_at should be valid ISO date-time", () => {
      const date = new Date(updatedBanRecord.revoked_at!);
      return !isNaN(date.getTime());
    });
  }
  // Validate other properties remain unchanged
  TestValidator.equals(
    "ban_reason should remain unchanged",
    updatedBanRecord.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.equals(
    "ban_duration_days should remain unchanged",
    updatedBanRecord.ban_duration_days,
    banRecord.ban_duration_days,
  );
  TestValidator.equals(
    "expires_at should remain unchanged",
    updatedBanRecord.expires_at,
    banRecord.expires_at,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedBanRecord.created_at,
    banRecord.created_at,
  );
}
