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

export async function test_api_user_ban_appeal_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create and authenticate admin
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
  // Admin creates ban record targeting the user
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: userAuth.id,
        banReason: RandomGenerator.paragraph({ sentences: 2 }),
        banDurationType: "temporary" as const,
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // User creates first appeal - should succeed
  const firstAppeal =
    await api.functional.discussionBoard.user.bans.appeals.create(
      userConnection,
      {
        banId: banRecord.id,
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  typia.assert(firstAppeal);
  // User attempts to create second appeal for same ban - should fail
  await TestValidator.error("duplicate appeal submission", async () => {
    await api.functional.discussionBoard.user.bans.appeals.create(
      userConnection,
      {
        banId: banRecord.id,
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  });
  // Validate first appeal was successfully created
  TestValidator.equals(
    "appeal belongs to correct ban",
    firstAppeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "appeal belongs to correct user",
    firstAppeal.user.id,
    userAuth.id,
  );
}
