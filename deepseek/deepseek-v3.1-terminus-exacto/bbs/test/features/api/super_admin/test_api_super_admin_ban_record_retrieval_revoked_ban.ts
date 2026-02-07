import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_super_admin_ban_record_retrieval_revoked_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a ban record
  const banRecord =
    await generate_random_discussion_board_super_admin_ban_records_create(
      superAdminConnection,
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
  typia.assert(banRecord);
  // Revoke the ban record
  const revocationReason = RandomGenerator.paragraph({ sentences: 1 });
  const revokedBanRecord =
    await api.functional.discussionBoard.superAdmin.ban_records.update(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
        body: {
          ban_status: "revoked",
          revoked_reason: revocationReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(revokedBanRecord);
  // Validate the revocation was successful
  TestValidator.equals(
    "revoked ban status",
    revokedBanRecord.ban_status,
    "revoked",
  );
  TestValidator.predicate(
    "revoked_at should be set after revocation",
    revokedBanRecord.revoked_at !== null &&
      revokedBanRecord.revoked_at !== undefined,
  );
  TestValidator.equals(
    "revoked_reason should match",
    revokedBanRecord.revoked_reason,
    revocationReason,
  );
  // Retrieve the revoked ban record
  const retrievedBanRecord =
    await api.functional.discussionBoard.superAdmin.ban_records.at(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
      },
    );
  typia.assert(retrievedBanRecord);
  // Validate the retrieval contains correct revocation details
  TestValidator.equals(
    "ban status should be revoked",
    retrievedBanRecord.ban_status,
    "revoked",
  );
  TestValidator.predicate(
    "revoked_at should contain valid timestamp",
    retrievedBanRecord.revoked_at !== null &&
      retrievedBanRecord.revoked_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(
        retrievedBanRecord.revoked_at!,
      ),
  );
  TestValidator.equals(
    "revoked_reason should match",
    retrievedBanRecord.revoked_reason,
    revocationReason,
  );
  TestValidator.equals(
    "retrieved record ID should match original",
    retrievedBanRecord.id,
    banRecord.id,
  );
}
