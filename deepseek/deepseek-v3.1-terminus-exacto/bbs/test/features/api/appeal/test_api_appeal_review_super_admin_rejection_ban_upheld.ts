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

export async function test_api_appeal_review_super_admin_rejection_ban_upheld(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Store user password for later authentication test
  const userPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create user account that will be banned
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create administrator to issue initial ban
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
  // 3. Administrator bans the user
  const ban = await api.functional.discussionBoard.admin.user_bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "permanent",
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(ban);
  // 4. User submits appeal against ban
  const appeal = await api.functional.discussionBoard.user.bans.appeals.create(
    userConnection,
    {
      banId: ban.id,
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
    },
  );
  typia.assert(appeal);
  // 5. Create super administrator for appeal review
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 6. Super administrator reviews appeal with rejection
  const reviewedAppeal =
    await api.functional.discussionBoard.superAdmin.appeals.review(
      superAdminConnection,
      {
        appealId: appeal.id,
        body: {
          status: "rejected",
          decision_reason:
            "The ban was justified based on community guidelines violations.",
        } satisfies IDiscussionBoardBanAppeal.IReview,
      },
    );
  typia.assert(reviewedAppeal);
  // 7. Validate appeal status is rejected with decision reason
  TestValidator.equals(
    "appeal status should be rejected",
    reviewedAppeal.status,
    "rejected",
  );
  TestValidator.equals(
    "decision reason should be recorded",
    reviewedAppeal.decision_reason,
    "The ban was justified based on community guidelines violations.",
  );
  // 8. Validate review timestamp is set
  TestValidator.predicate(
    "review timestamp should be set",
    reviewedAppeal.reviewed_at !== null &&
      reviewedAppeal.reviewed_at !== undefined,
  );
  // 9. Validate reviewer is set to super administrator
  TestValidator.predicate(
    "reviewer should be set",
    reviewedAppeal.reviewer !== null && reviewedAppeal.reviewer !== undefined,
  );
  TestValidator.equals(
    "reviewer should be the super admin",
    reviewedAppeal.reviewer?.id,
    superAdmin.admin?.id,
  );
  // 10. Verify ban remains active
  TestValidator.equals(
    "ban status should remain active",
    reviewedAppeal.banRecord.banStatus,
    "active",
  );
  // 11. Verify user cannot authenticate (ban is upheld) with correct password
  await TestValidator.error(
    "banned user should not be able to login",
    async () => {
      await authorize_user_login(userConnection, {
        body: {
          email: user.email,
          password: userPassword,
        } satisfies IDiscussionBoardUser.ILogin,
      });
    },
  );
}
