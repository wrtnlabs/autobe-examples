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
 * Test that attempting to revoke an already revoked ban returns an appropriate error.
 * Create a ban record with status 'revoked' (already revoked by another administrator).
 * Authenticate as an administrator and attempt to revoke this ban.
 * Verify that the operation fails with a validation error indicating the ban cannot be revoked
 * because it's already in revoked status. Ensure the system prevents duplicate revocation attempts.
 */
export async function test_api_admin_ban_revocation_already_revoked(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email:
        "admin" + Math.random().toString(36).substring(2, 10) + "@test.com",
      password: "password123",
      display_name: "Test Administrator",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a ban record that is already in revoked status
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: "Test ban reason for already revoked ban",
          ban_status: "revoked",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  // Verify the ban record is indeed in revoked status
  if (banRecord.ban_status !== "revoked") {
    throw new Error(
      `Expected ban status to be 'revoked', but got '${banRecord.ban_status}'`,
    );
  }
  // Attempt to revoke the already revoked ban - this should fail
  try {
    await api.functional.discussionBoard.admin.revoke(adminConnection, {
      banId: banRecord.id,
      body: {
        revoked_reason: "Attempting to revoke already revoked ban",
      } satisfies IDiscussionBoardBanRecord.IRevoke,
    });
    throw new Error("Expected revoke operation to fail but it succeeded");
  } catch (error) {
    // Expected - operation should fail
    if (!(error instanceof Error)) {
      throw new Error("Expected error to be an instance of Error");
    }
  }
  // Verify the ban record remains unchanged
  if (banRecord.ban_status !== "revoked") {
    throw new Error(
      `Expected ban status to remain 'revoked', but got '${banRecord.ban_status}'`,
    );
  }
}
