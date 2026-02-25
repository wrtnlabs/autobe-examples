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

export async function test_api_admin_ban_creation_temporary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. User setup and authentication using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 3. User creates an article using utility function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Admin creates temporary ban using utility function (30 days)
  const banDurationDays = 30;
  const banStartTime = new Date();
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason:
          "Temporary suspension for policy violation. Minimum 10 characters required.",
        banDurationType: "temporary",
        banDurationDays: banDurationDays,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 5. Validate ban record properties (business logic only)
  TestValidator.equals("ban status active", banRecord.banStatus, "active");
  TestValidator.equals(
    "ban duration type temporary",
    banRecord.banDurationType,
    "temporary",
  );
  TestValidator.equals(
    "ban duration days matches input",
    banRecord.banDurationDays,
    banDurationDays,
  );
  TestValidator.equals(
    "banned user ID matches",
    banRecord.bannedUser.id,
    user.id,
  );
  TestValidator.predicate(
    "ban start time is reasonable",
    new Date(banRecord.banStartedAt) >= banStartTime,
  );
  TestValidator.predicate(
    "ban end time is set for temporary ban",
    banRecord.banEndsAt !== null,
  );
  // Validate temporal calculation without HTTP status testing
  if (banRecord.banEndsAt) {
    const expectedEndTime = new Date(
      banStartTime.getTime() + banDurationDays * 24 * 60 * 60 * 1000,
    );
    const actualEndTime = new Date(banRecord.banEndsAt);
    const timeDifference = Math.abs(
      actualEndTime.getTime() - expectedEndTime.getTime(),
    );
    TestValidator.predicate(
      "ban end time calculation is accurate",
      timeDifference < 5000,
    ); // 5 second tolerance for server processing
  }
  // 6. Verify basic business logic - user association
  TestValidator.equals(
    "banning administrator ID matches",
    banRecord.banningAdministrator.id,
    admin.id,
  );
  TestValidator.equals(
    "banned user email matches",
    banRecord.bannedUser.email,
    user.email,
  );
}
