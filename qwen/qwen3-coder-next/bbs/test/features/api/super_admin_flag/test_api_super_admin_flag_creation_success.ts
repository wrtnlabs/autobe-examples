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

export async function test_api_super_admin_flag_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await api.functional.discussionBoard.auth.super_admin.join(
    adminConnection,
    {
      body: {
        // Empty body as per IDiscussionBoardSuperAdmin.IJoin definition
      },
    },
  );
  typia.assert(authResult);
  // 2. Create a flag request
  const flagRequest: IDiscussionBoardFlag.ICreate = {
    // Empty object as per IDiscussionBoardFlag.ICreate definition
  };
  // 3. Submit flag creation request
  const flag =
    await api.functional.discussionBoard.superAdmin.moderation.flags.create(
      adminConnection,
      {
        body: flagRequest,
      },
    );
  typia.assert(flag);
}
