import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_appeals_create } from "../../../generate/generate_random_discussion_board_bans_appeals_create";
import { generate_random_discussion_board_super_admin_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_bans_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test retrieving a ban appeal that has been reviewed and approved by an administrator.
 * Verifies that the appeal status is 'approved' with proper reviewer information and timestamps.
 */
export async function test_api_ban_appeal_retrieval_reviewed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator using SDK directly
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.Format<"password">>(),
          privilege_level: "super_admin",
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  // 2. Create user to be banned using SDK directly
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password12345678", // Minimum 8 characters
        display_name: "Test User",
        bio: "Test user biography",
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(userAuth);
  // 3. Create ban record for the user
  const banRecord = await api.functional.discussionBoard.superAdmin.bans.create(
    superAdminConnection,
    {
      body: {
        banned_user_id: userAuth.id,
        ban_reason: "Test ban reason",
        ban_duration_type: "permanent",
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(banRecord);
  // 4. Submit appeal for the ban
  const appeal = await api.functional.discussionBoard.bans.appeals.create(
    userConnection,
    {
      banId: banRecord.id,
      body: {
        appeal_reason: "Test appeal reason",
      } satisfies IDiscussionBoardBanAppeal.ICreate,
    },
  );
  typia.assert(appeal);
  // 5. Review and approve the appeal
  const decisionReason = "Appeal approved after review";
  const reviewedAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.putByBanidAndAppealid(
      superAdminConnection,
      {
        banId: banRecord.id,
        appealId: appeal.id,
        body: {
          status: "approved",
          decision_reason: decisionReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(reviewedAppeal);
  // 6. Retrieve the appeal and verify reviewed status
  const retrievedAppeal =
    await api.functional.discussionBoard.superAdmin.ban_records.appeals.at(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);
  // Validate the appeal has been reviewed and approved using typia.assert for type safety
  // The typia.assert above already validates all properties, so we just need to verify business logic
  if (retrievedAppeal.status !== "approved") {
    throw new Error(
      `Expected status 'approved' but got '${retrievedAppeal.status}'`,
    );
  }
  if (retrievedAppeal.decision_reason !== decisionReason) {
    throw new Error(`Decision reason mismatch`);
  }
  if (retrievedAppeal.reviewed_at === null) {
    throw new Error("Reviewed timestamp should be set");
  }
  if (retrievedAppeal.reviewer === null) {
    throw new Error("Reviewer information should be populated");
  }
  if (retrievedAppeal.appeal_reason !== appeal.appeal_reason) {
    throw new Error("Appeal reason should match original");
  }
  if (retrievedAppeal.banRecord.id !== banRecord.id) {
    throw new Error("Ban record ID should match");
  }
}
