import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_moderation_queue_create } from "../../../generate/generate_random_discussion_board_super_admin_moderation_queue_create";
import { prepare_random_discussion_board_bans_appeal } from "../../../prepare/prepare_random_discussion_board_bans_appeal";

export async function test_api_bans_appeal_with_minimal_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminToken = await api.functional.discussionBoard.auth.super_admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(adminToken);
  // 2. Prepare minimal valid appeal content
  const minimalAppealContent =
    typia.random<IDiscussionBoardBansAppeal.ICreate>();
  // 3. Generate a random ban record ID
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  // 4. Submit appeal with minimal content
  const appeal =
    await api.functional.discussionBoard.superAdmin.moderation.queue.create(
      adminConnection,
      {
        banRecordId: banRecordId,
        body: minimalAppealContent,
      },
    );
  // 5. Validate appeal was created successfully
  typia.assert(appeal);
}
