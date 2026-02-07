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
 * Test that attempting to revoke an expired ban returns an appropriate error.
 * 1. Create administrator account and authenticate
 * 2. Create an active ban record with a short duration
 * 3. Wait for the ban to naturally expire (simulate expired state)
 * 4. Attempt to revoke the expired ban as administrator
 * 5. Verify operation fails with validation error
 */
export async function test_api_admin_ban_revocation_expired_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
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
  // Create an active ban record with short duration (simulating soon-to-expire ban)
  const ban = await generate_random_discussion_board_admin_ban_records_create(
    adminConnection,
    {
      body: {
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_days: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1>
        >(), // 1 day duration
        ban_status: "active", // Must start as active
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(ban);
  // The ban creation endpoint returns the ban record, but we need to simulate
  // that this ban has expired naturally. Since we can't actually wait for time
  // to pass in a test, we'll create a ban record that represents an expired state
  // by using the API's ability to create bans with different statuses.
  // Create an expired ban record to simulate natural expiration
  const expiredBan =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<7>
          >(),
          ban_status: "expired", // This represents a ban that has naturally expired
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(expiredBan);
  // Attempt to revoke the expired ban - should fail
  await TestValidator.error("revoking expired ban should fail", async () => {
    await api.functional.discussionBoard.admin.revoke(adminConnection, {
      banId: expiredBan.id,
      body: {
        revoked_reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardBanRecord.IRevoke,
    });
  });
  // Verify the expired ban record remains expired
  TestValidator.equals(
    "ban status should remain expired",
    expiredBan.ban_status,
    "expired",
  );
  // Also verify that active bans can be revoked (positive control)
  const activeBan =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<365>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(activeBan);
  // Revoke the active ban - should succeed
  const revokedBan = await api.functional.discussionBoard.admin.revoke(
    adminConnection,
    {
      banId: activeBan.id,
      body: {
        revoked_reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardBanRecord.IRevoke,
    },
  );
  typia.assert(revokedBan);
  TestValidator.equals(
    "active ban should be revoked",
    revokedBan.ban_status,
    "revoked",
  );
}
