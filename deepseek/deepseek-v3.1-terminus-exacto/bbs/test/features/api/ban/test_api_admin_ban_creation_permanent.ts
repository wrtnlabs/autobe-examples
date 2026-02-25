import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_ban_creation_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com/admin",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Regular user setup and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // 3. Regular user creates content to verify post-ban visibility
  // Note: Section ID needs to be obtained from existing sections in the system
  // For test purposes, we'll skip article creation and focus on ban functionality
  // since section management is not part of the available API functions
  // 4. Admin creates permanent ban
  const banReason = RandomGenerator.paragraph({ sentences: 3 }); // Ensures min 10 chars
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: banReason,
        banDurationType: "permanent",
        banDurationDays: null,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 5. Validate ban record
  TestValidator.equals("ban reason matches", banRecord.banReason, banReason);
  TestValidator.equals(
    "ban duration type is permanent",
    banRecord.banDurationType,
    "permanent",
  );
  TestValidator.equals(
    "ban duration days is null for permanent",
    banRecord.banDurationDays,
    null,
  );
  TestValidator.predicate(
    "ban status is active",
    banRecord.banStatus === "active",
  );
  TestValidator.notEquals(
    "ban start time is set",
    banRecord.banStartedAt,
    null,
  );
  TestValidator.equals(
    "ban ends time is null for permanent",
    banRecord.banEndsAt,
    null,
  );
  TestValidator.equals(
    "banned user ID matches",
    banRecord.bannedUser.id,
    user.id,
  );
  TestValidator.equals(
    "banning admin ID matches",
    banRecord.banningAdministrator.id,
    admin.id,
  );
  TestValidator.predicate(
    "created at timestamp is set",
    banRecord.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated at timestamp is set",
    banRecord.updatedAt.length > 0,
  );
  // Verify the ban was successfully created - this validates the core functionality
  TestValidator.predicate("ban record has valid ID", banRecord.id.length > 0);
}
