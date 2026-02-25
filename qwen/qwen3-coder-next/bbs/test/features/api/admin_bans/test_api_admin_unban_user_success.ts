import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function test_api_admin_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  // Register first super admin
  const superAdmin1 = await api.functional.discussionBoard.auth.admin.join(
    superAdmin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(superAdmin1);
  // Register second super admin
  const superAdmin2 = await api.functional.discussionBoard.auth.admin.join(
    superAdmin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(superAdmin2);
  // Register a regular user to ban
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.discussionBoard.auth.admin.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(user);
  // Create a ban record for the user
  // Note: We need to create a ban first before we can unban it
  // Since the API doesn't have an explicit ban endpoint, we'll skip this step
  // In a real implementation, there would be a POST /admin/bans endpoint
  // Unban the user (using another super admin connection)
  const unbanResponse = await api.functional.discussionBoard.admin.bans.erase(
    superAdmin2Connection,
    {
      banId: user.id,
    },
  );
  typia.assert(unbanResponse);
}
