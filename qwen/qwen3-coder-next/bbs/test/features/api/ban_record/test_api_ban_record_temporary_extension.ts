import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_ban_record_temporary_extension(
  connection: api.IConnection,
): Promise<void> {
  // Create admin actor connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Create super admin actor connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
  });
  // Create ban record (but cannot extract ID due to empty response type)
  await api.functional.discussionBoard.admin.bans.create(adminConnection, {
    body: typia.random<IDiscussionBoardBansBanRecord.ICreate>(),
  });
  // Generate a random banRecordId since we cannot extract it from the created record
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  // Update ban record with temporary extension
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.admins.bans.update(
      superAdminConnection,
      {
        banRecordId: banRecordId,
        body: typia.random<IDiscussionBoardBansBanRecord.IUpdate>(),
      },
    );
  typia.assert(updatedBanRecord);
}
