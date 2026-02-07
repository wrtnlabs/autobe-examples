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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_ban_appeal_approve_and_unban(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Create a ban record
  const banRecord: IDiscussionBoardBansBanRecord =
    await generate_random_discussion_board_admin_bans_create(adminConnection, {
      body: typia.random<IDiscussionBoardBansBanRecord.ICreate>(),
    });
  typia.assert(banRecord);
  // Update ban appeal to approve (which should unban the user)
  const updatedAppeal: IDiscussionBoardBansAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.update(
      adminConnection,
      {
        appealId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IDiscussionBoardBansAppeal.IUpdate>(),
      },
    );
  typia.assert(updatedAppeal);
}
