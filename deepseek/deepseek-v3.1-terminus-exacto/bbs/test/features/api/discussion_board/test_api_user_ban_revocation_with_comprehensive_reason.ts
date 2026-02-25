import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_user_ban_revocation_with_comprehensive_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a user to be banned (using admin connection since we don't have user creation API)
  // Note: Since we don't have user creation utility functions, we'll use the admin's own ID for testing
  const userToBanId = adminAuth.id;
  // 3. Create a temporary ban record for testing revocation
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: userToBanId,
          banReason: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MinLength<10>,
          banDurationType: "temporary",
          banDurationDays: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
          >(),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Verify ban properties after creation
  TestValidator.equals(
    "banned user ID should match",
    banRecord.bannedUser.id,
    userToBanId,
  );
  TestValidator.predicate(
    "ban should have valid start time",
    new Date(banRecord.banStartedAt) <= new Date(),
  );
  TestValidator.predicate(
    "temporary ban should have end time",
    banRecord.banEndsAt !== null,
  );
  // 5. Revoke the ban with comprehensive reason
  const revocationReason =
    "Ban revoked due to successful appeal process and good behavior demonstrated by the user. The user has completed required training and shown commitment to following community guidelines.";
  const revokedBan =
    await api.functional.discussionBoard.admin.user_bans.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          banStatus: "revoked",
          revocationReason: revocationReason,
          revokedAt: new Date().toISOString(),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(revokedBan);
  // 6. Validate revocation metadata
  TestValidator.equals(
    "ban status should be revoked",
    revokedBan.banStatus,
    "revoked",
  );
  TestValidator.equals(
    "revocation reason should match",
    revokedBan.revocationReason,
    revocationReason,
  );
  TestValidator.predicate(
    "revocation timestamp should be set",
    revokedBan.revokedAt !== null,
  );
  TestValidator.predicate(
    "revocation timestamp should be recent",
    revokedBan.revokedAt !== null &&
      new Date(revokedBan.revokedAt).getTime() > Date.now() - 60000,
  );
  // 7. Verify other ban properties remain unchanged
  TestValidator.equals(
    "banned user ID unchanged",
    revokedBan.bannedUser.id,
    banRecord.bannedUser.id,
  );
  TestValidator.equals(
    "ban reason unchanged",
    revokedBan.banReason,
    banRecord.banReason,
  );
  TestValidator.equals(
    "ban duration type unchanged",
    revokedBan.banDurationType,
    banRecord.banDurationType,
  );
  TestValidator.equals(
    "ban duration days unchanged",
    revokedBan.banDurationDays,
    banRecord.banDurationDays,
  );
  TestValidator.equals(
    "ban start time unchanged",
    revokedBan.banStartedAt,
    banRecord.banStartedAt,
  );
  TestValidator.equals(
    "ban end time unchanged",
    revokedBan.banEndsAt,
    banRecord.banEndsAt,
  );
  TestValidator.equals(
    "appeal status unchanged",
    revokedBan.appealStatus,
    banRecord.appealStatus,
  );
}
