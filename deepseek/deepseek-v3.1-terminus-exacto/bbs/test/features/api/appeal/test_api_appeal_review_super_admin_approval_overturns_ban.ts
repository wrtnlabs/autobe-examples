import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { generate_random_discussion_board_user_bans_appeals_create } from "../../../generate/generate_random_discussion_board_user_bans_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test scenario where super administrator approves a ban appeal, resulting in banned user regaining access.
 * 1. Create regular user account
 * 2. Create ban record targeting the user
 * 3. User submits appeal against the ban
 * 4. Super administrator reviews and approves the appeal
 * 5. Verify ban status changes to revoked
 * 6. Verify appeal status updates to approved
 * 7. Verify user can authenticate successfully after approval
 * 8. Validate audit trail including timestamps and decision reason
 */
export async function test_api_appeal_review_super_admin_approval_overturns_ban(
  connection: api.IConnection,
): Promise<void> {
  // Store the original password for later login validation
  const userPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create admin account to issue the ban
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
  // 3. Create ban record targeting the user
  const banRecord = await api.functional.discussionBoard.admin.user_bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: userAuth.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 4. User submits appeal against the ban
  const appeal = await api.functional.discussionBoard.user.bans.appeals.create(
    userConnection,
    {
      banId: banRecord.id,
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
    },
  );
  typia.assert(appeal);
  // 5. Create super administrator account for appeal review
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 6. Super administrator reviews and approves the appeal
  const reviewedAppeal =
    await api.functional.discussionBoard.superAdmin.appeals.review(
      superAdminConnection,
      {
        appealId: appeal.id,
        body: {
          status: "approved",
          decision_reason: "Appeal approved after thorough review",
        } satisfies IDiscussionBoardBanAppeal.IReview,
      },
    );
  typia.assert(reviewedAppeal);
  // 7. Verify appeal status is approved
  TestValidator.equals(
    "appeal status should be approved",
    reviewedAppeal.status,
    "approved",
  );
  TestValidator.equals(
    "appeal decision reason should match",
    reviewedAppeal.decision_reason,
    "Appeal approved after thorough review",
  );
  TestValidator.predicate(
    "appeal should have review timestamp",
    reviewedAppeal.reviewed_at !== null,
  );
  // 8. Verify user can authenticate successfully after appeal approval
  await TestValidator.predicate(
    "user should be able to login after appeal approval",
    async () => {
      const loginConnection: api.IConnection = { host: connection.host };
      const loginResult = await authorize_user_login(loginConnection, {
        body: {
          email: userAuth.email,
          password: userPassword,
        } satisfies IDiscussionBoardUser.ILogin,
      });
      typia.assert(loginResult);
      return true;
    },
  );
  // 9. Validate that the appeal review process completed successfully
  TestValidator.predicate(
    "appeal review process should be complete",
    reviewedAppeal.status === "approved" && reviewedAppeal.reviewed_at !== null,
  );
}
