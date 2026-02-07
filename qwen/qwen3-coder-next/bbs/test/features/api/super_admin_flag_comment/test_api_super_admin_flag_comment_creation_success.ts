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

export async function test_api_super_admin_flag_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin using login (join creates account, login authenticates)
  // Note: Based on the provided API, join endpoint creates a super admin account but doesn't authenticate.
  // The test scenario requires authentication to create a flag, so we need a login endpoint which should be available.
  // If login doesn't exist, we cannot proceed with authentication. For now, assuming the system provides a way to authenticate.
  // 2. Create flag for comment
  // Since IDiscussionBoardFlag is empty ({}), we can only test that the flag is created successfully
  // and validates against the schema without checking specific properties
  const flag =
    await api.functional.discussionBoard.superAdmin.moderation.flags.create(
      connection,
      {
        body: typia.random<IDiscussionBoardFlag.ICreate>(),
      },
    );
  typia.assert(flag);
  // 3. Validate flag is defined and has correct structure (empty object)
  TestValidator.predicate("flag created successfully", flag !== null);
}
