import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test revoking an active ban with proper revocation reason.
 * An administrator creates a temporary ban, then revokes it by updating
 * the ban status to 'revoked' and providing a detailed revocation reason.
 * Verify that the ban record shows revoked status, includes the revocation
 * timestamp and reason, and maintains audit trail integrity while preventing
 * the banned user from remaining restricted.
 */
export async function test_api_admin_ban_revocation_with_reason(
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
  // Create a temporary ban record
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_type: "temporary",
        ban_duration_days: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(banRecord);
  // Revoke the ban with detailed revocation reason
  const revocationReason =
    "Ban was revoked after user appeal and review process";
  const revokedBan = await api.functional.discussionBoard.admin.bans.update(
    adminConnection,
    {
      banId: banRecord.id,
      body: {
        ban_status: "revoked",
        revoked_reason: revocationReason,
      } satisfies IDiscussionBoardBanRecord.IUpdate,
    },
  );
  typia.assert(revokedBan);
  // Validate revocation details
  TestValidator.equals(
    "ban status should be revoked",
    revokedBan.ban_status,
    "revoked",
  );
  TestValidator.notEquals(
    "revocation timestamp should be set",
    revokedBan.revoked_at,
    null,
  );
  TestValidator.equals(
    "revocation reason should match",
    revokedBan.revoked_reason,
    revocationReason,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(revokedBan.updated_at) > new Date(revokedBan.created_at),
  );
}
