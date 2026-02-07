import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_bans_appeals_create } from "../../../generate/generate_random_discussion_board_admin_bans_appeals_create";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_appeal } from "../../../prepare/prepare_random_discussion_board_bans_appeal";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

/**
 * Test scenario for rejecting a ban appeal while maintaining the ban.
 * The test creates a banned user and submits an appeal. An administrator
 * reviews the appeal but rejects it, keeping the user banned.
 */
export async function test_api_bans_appeal_reject_maintain_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      member_id: typia.random<string & tags.Format<"uuid">>(),
      admin_role_id: typia.random<string & tags.Format<"uuid">>(),
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a ban record for a user
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        start_time: new Date().toISOString(),
        end_time: null, // Permanent ban
      } satisfies IDiscussionBoardBansBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 3. Submit a ban appeal
  const appeal =
    await generate_random_discussion_board_admin_bans_appeals_create(
      adminConnection,
      {
        body: {
          appeal_reason: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardBansAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  // 4. Reject the ban appeal using a generated appeal ID
  const appealId = typia.random<string & tags.Format<"uuid">>();
  const updatedAppeal =
    await api.functional.discussionBoard.admin.admins.bans.appeals.process(
      adminConnection,
      {
        appealId: appealId,
        body: {
          status: "rejected" as const,
          review_notes: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardBansAppeal.IRequest,
      },
    );
  typia.assert(updatedAppeal);
}
