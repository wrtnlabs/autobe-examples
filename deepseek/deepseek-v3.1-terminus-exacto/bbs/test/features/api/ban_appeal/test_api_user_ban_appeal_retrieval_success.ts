import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_user_bans_appeals_create } from "../../../generate/generate_random_discussion_board_user_bans_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_user_ban_appeal_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for ban creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. User setup for the ban target
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_login(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // 3. Admin creates ban record targeting the user
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: userAuth.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "temporary" as const,
        banDurationDays: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(ban);
  // 4. User submits ban appeal
  const appeal =
    await generate_random_discussion_board_user_bans_appeals_create(
      userConnection,
      {
        params: { banId: ban.id },
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  // 5. Retrieve the ban appeal details
  const retrievedAppeal =
    await api.functional.discussionBoard.user.bans.appeals.at(userConnection, {
      banId: ban.id,
      appealId: appeal.id,
    });
  typia.assert(retrievedAppeal);
  // 6. Validate the response structure and content
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal reason matches input",
    retrievedAppeal.appeal_reason,
    appeal.appeal_reason,
  );
  TestValidator.predicate(
    "status should be a string",
    typeof retrievedAppeal.status === "string",
  );
  TestValidator.predicate(
    "appealed_at should be valid date",
    !isNaN(new Date(retrievedAppeal.appealed_at).getTime()),
  );
  TestValidator.equals(
    "ban record ID matches",
    retrievedAppeal.banRecord.id,
    ban.id,
  );
  TestValidator.equals("user ID matches", retrievedAppeal.user.id, userAuth.id);
  TestValidator.predicate(
    "reviewer should be null or admin summary",
    retrievedAppeal.reviewer === null ||
      (typeof retrievedAppeal.reviewer === "object" &&
        retrievedAppeal.reviewer !== null &&
        "id" in retrievedAppeal.reviewer),
  );
}
