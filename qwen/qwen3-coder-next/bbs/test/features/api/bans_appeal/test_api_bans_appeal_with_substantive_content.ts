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

export async function test_api_bans_appeal_with_substantive_content(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // Generate random ban record ID
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  // Create appeal with substantive content
  const appeal =
    await api.functional.discussionBoard.superAdmin.moderation.queue.create(
      adminConnection,
      {
        banRecordId,
        body: {
          // Appeal with comprehensive reasoning
          reason: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardBansAppeal.ICreate,
      },
    );
  // Validate appeal response
  typia.assert(appeal);
  // Skip banRecordId validation - property does not exist on IDiscussionBoardBansAppeal
}