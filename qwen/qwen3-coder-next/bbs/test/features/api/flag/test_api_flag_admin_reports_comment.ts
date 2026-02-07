import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_moderation_flags_create } from "../../../generate/generate_random_discussion_board_admin_moderation_flags_create";
import { prepare_random_discussion_board_flag } from "../../../prepare/prepare_random_discussion_board_flag";

export async function test_api_flag_admin_reports_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account through join operation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Admin authentication - login to establish admin session
  const adminSessionConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminSessionConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // 3. Admin reports a comment for moderation
  // Note: DTO is empty, so we use random data generation
  const flag =
    await api.functional.discussionBoard.admin.moderation.flags.create(
      adminSessionConnection,
      {
        body: typia.random<IDiscussionBoardFlag.ICreate>(),
      },
    );
  typia.assert(flag);
}
