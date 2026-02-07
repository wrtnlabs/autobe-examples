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

/**
 * Test ban record creation with expired status validation.
 * 1. Create super administrator account
 * 2. Create ban records with 'expired' status
 * 3. Validate ban record properties and status handling
 */
export async function test_api_ban_records_superadmin_expired_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  typia.assert(superAdmin);
  // Create ban record with expired status
  const banRecord =
    await generate_random_discussion_board_super_admin_ban_records_create(
      superAdminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "expired",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Validate ban record properties
  TestValidator.equals(
    "ban status is expired",
    banRecord.ban_status,
    "expired",
  );
  TestValidator.predicate("has ban reason", banRecord.ban_reason.length > 0);
  TestValidator.predicate(
    "has creation timestamp",
    banRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "has update timestamp",
    banRecord.updated_at.length > 0,
  );
  // Create another ban record with expired status and null duration (permanent ban that expired)
  const permanentExpiredBan =
    await generate_random_discussion_board_super_admin_ban_records_create(
      superAdminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
          ban_duration_days: null,
          ban_status: "expired",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(permanentExpiredBan);
  // Validate permanent expired ban properties
  TestValidator.equals(
    "permanent ban status is expired",
    permanentExpiredBan.ban_status,
    "expired",
  );
  TestValidator.equals(
    "permanent ban duration is null",
    permanentExpiredBan.ban_duration_days,
    null,
  );
  TestValidator.equals(
    "permanent ban expires_at is null",
    permanentExpiredBan.expires_at,
    null,
  );
  // Test that expired bans can be created with different durations
  const shortExpiredBan =
    await generate_random_discussion_board_super_admin_ban_records_create(
      superAdminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<7>
          >(),
          ban_status: "expired",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(shortExpiredBan);
  // Validate short expired ban properties
  TestValidator.equals(
    "short ban status is expired",
    shortExpiredBan.ban_status,
    "expired",
  );
  TestValidator.predicate(
    "short ban has duration",
    shortExpiredBan.ban_duration_days !== null,
  );
  TestValidator.predicate(
    "short ban has expires_at",
    shortExpiredBan.expires_at !== null,
  );
}
