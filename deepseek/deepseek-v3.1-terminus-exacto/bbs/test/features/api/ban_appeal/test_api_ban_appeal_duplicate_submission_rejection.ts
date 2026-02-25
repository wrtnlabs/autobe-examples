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
import { generate_random_discussion_board_user_appeals_create } from "../../../generate/generate_random_discussion_board_user_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test that users cannot submit multiple appeals for the same ban record.
 * Validates the 'One appeal per ban record maximum' business rule.
 */
export async function test_api_ban_appeal_duplicate_submission_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin authentication
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
  // Setup regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // Admin creates ban record against the user
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: userAuth.id,
        banReason: RandomGenerator.paragraph({ sentences: 5 }), // Ensure minimum 10 characters
        banDurationType: "temporary" as const,
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // User submits first appeal
  const firstAppeal = await api.functional.discussionBoard.user.appeals.create(
    userConnection,
    {
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
    },
  );
  typia.assert(firstAppeal);
  // Validate first appeal was created successfully
  TestValidator.equals(
    "appeal should be linked to the correct ban record",
    firstAppeal.banRecord.id,
    banRecord.id,
  );
  // User attempts to submit second appeal for the same ban record
  await TestValidator.error(
    "duplicate appeal submission should be rejected",
    async () => {
      await api.functional.discussionBoard.user.appeals.create(userConnection, {
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      });
    },
  );
  // Additional validation: The first appeal should remain unchanged
  TestValidator.predicate(
    "first appeal should remain in pending status",
    firstAppeal.status === "pending",
  );
}
