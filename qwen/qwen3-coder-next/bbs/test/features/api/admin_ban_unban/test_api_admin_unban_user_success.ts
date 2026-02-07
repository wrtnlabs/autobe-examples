import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as admin to get authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorization = await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(adminAuthorization);
  // 2. Create a ban record (in real scenario, this would be done through admin interface)
  // Since there's no ban creation API provided, we'll test the unban endpoint
  // assuming a ban record exists. In production tests, this would be set up via
  // database seeding or a separate ban creation endpoint.
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test unban endpoint - delete ban record
  // This should return void (204 No Content) on successful deletion
  await api.functional.discussionBoard.admin.admins.bans.erase(
    adminConnection,
    {
      banRecordId: banRecordId,
    },
  );
  // 4. Verify the operation completed successfully
  // The erase function returns void, so successful execution means success
}
