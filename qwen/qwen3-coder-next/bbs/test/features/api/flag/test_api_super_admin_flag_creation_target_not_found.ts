import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlag";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_moderation_flags_create } from "../../../generate/generate_random_discussion_board_super_admin_moderation_flags_create";
import { prepare_random_discussion_board_flag } from "../../../prepare/prepare_random_discussion_board_flag";

export async function test_api_super_admin_flag_creation_target_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin login
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  typia.assert(adminConnection.headers);
  // 2. Create flag with non-existent target
  const flag =
    await api.functional.discussionBoard.superAdmin.moderation.flags.create(
      adminConnection,
      {
        body: {
          target_id: "00000000-0000-0000-0000-000000000000",
          reason: "inappropriate content",
          description: "This content violates community guidelines",
        } satisfies IDiscussionBoardFlag.ICreate,
      },
    );
  typia.assert(flag);
}
