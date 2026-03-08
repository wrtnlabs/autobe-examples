import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account for testing
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinResponse =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 3 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(joinResponse);
  // Step 2: Create new connection with the obtained token
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // Step 3: Prepare update data
  const updateData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardGuest.IUpdate;
  // Step 4: Update super admin profile
  await api.functional.discussionBoard.superAdmin.actors.update(
    authConnection,
    {
      body: updateData,
    },
  );
  // Step 5: Verify update was successful (no error thrown means success)
  // Since the update endpoint returns void, successful execution confirms the update
}
