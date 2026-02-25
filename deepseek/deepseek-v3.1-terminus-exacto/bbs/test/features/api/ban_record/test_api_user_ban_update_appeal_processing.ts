import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test updating a ban with appeal status changes. Authenticate as super administrator,
 * create active ban using the admin endpoint, then update appeal status from 'none' to
 * 'pending' and later to 'approved' with decision reason. Validate that appeal workflow
 * transitions are handled correctly.
 */
export async function test_api_user_ban_update_appeal_processing(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a user to be banned
  const userToBan = {
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IDiscussionBoardUser;
  // Create initial ban record
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: userToBan.id,
          banReason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 15,
          }),
          banDurationType: "temporary",
          banDurationDays: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Verify initial state
  TestValidator.equals("initial ban status", banRecord.banStatus, "active");
  TestValidator.equals("initial appeal status", banRecord.appealStatus, "none");
  TestValidator.equals("initial appeal reason", banRecord.appealReason, null);
  // Update appeal status to 'pending' with appeal reason
  const appealReason = RandomGenerator.paragraph({ sentences: 2 });
  const pendingBanRecord =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminConnection,
      {
        banId: banRecord.id,
        body: {
          appealStatus: "pending",
          appealReason: appealReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(pendingBanRecord);
  // Verify pending appeal state
  TestValidator.equals(
    "appeal status updated to pending",
    pendingBanRecord.appealStatus,
    "pending",
  );
  TestValidator.equals(
    "appeal reason recorded",
    pendingBanRecord.appealReason,
    appealReason,
  );
  TestValidator.notEquals(
    "appeal reviewed at timestamp",
    pendingBanRecord.appealReviewedAt,
    null,
  );
  TestValidator.predicate(
    "appeal reviewed at is valid date",
    pendingBanRecord.appealReviewedAt !== null &&
      new Date(pendingBanRecord.appealReviewedAt).getTime() > 0,
  );
  // Update appeal status to 'approved' with decision reason
  const decisionReason = RandomGenerator.paragraph({ sentences: 2 });
  const approvedBanRecord =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminConnection,
      {
        banId: banRecord.id,
        body: {
          appealStatus: "approved",
          appealDecisionReason: decisionReason,
          banStatus: "revoked",
          revokedAt: new Date().toISOString(),
          revocationReason: "Appeal approved - ban lifted",
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(approvedBanRecord);
  // Verify approved appeal state
  TestValidator.equals(
    "appeal status updated to approved",
    approvedBanRecord.appealStatus,
    "approved",
  );
  TestValidator.equals(
    "appeal decision reason recorded",
    approvedBanRecord.appealDecisionReason,
    decisionReason,
  );
  TestValidator.equals(
    "ban status revoked due to appeal",
    approvedBanRecord.banStatus,
    "revoked",
  );
  TestValidator.notEquals(
    "revocation timestamp set",
    approvedBanRecord.revokedAt,
    null,
  );
  TestValidator.equals(
    "revocation reason recorded",
    approvedBanRecord.revocationReason,
    "Appeal approved - ban lifted",
  );
  // Verify ban integrity maintained
  TestValidator.equals(
    "banned user unchanged",
    approvedBanRecord.bannedUser.id,
    userToBan.id,
  );
  // Fix: Properly extract and validate the administrator ID
  const adminId = adminConnection.headers?.id;
  const validatedAdminId = typeof adminId === "string" 
    ? typia.assert<string & tags.Format<"uuid">>(adminId)
    : null;
  TestValidator.equals(
    "banning administrator unchanged",
    approvedBanRecord.banningAdministrator.id,
    validatedAdminId,
  );
  TestValidator.equals(
    "original ban reason preserved",
    approvedBanRecord.banReason,
    banRecord.banReason,
  );
}