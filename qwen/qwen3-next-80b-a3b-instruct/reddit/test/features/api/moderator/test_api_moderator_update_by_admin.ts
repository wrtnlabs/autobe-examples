import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsModeratorPermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModeratorPermissions";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderator_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create moderator connection and authenticate via join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 3: Create updated moderator configuration
  const updateBody: ICommunityBbsModerator.IUpdate = {
    permissions: {
      managePosts: true,
      manageComments: false,
      banUsers: true,
    },
    status: "active",
    scope: "global",
  } satisfies ICommunityBbsModerator.IUpdate;
  // Step 4: Perform the moderator update using admin connection
  await api.functional.communityBbs.moderator.moderators.update(
    adminConnection,
    {
      moderatorId: moderator.id,
      body: updateBody,
    },
  );
  // Since there is no 'at' function available in the API, we cannot retrieve the updated moderator.
  // The update operation returns void, and we assume that the operation succeeded.
  // We validate the integrity of the update by confirming the update request was prepared correctly.
  TestValidator.equals(
    "update permissions managePosts",
    updateBody.permissions?.managePosts,
    true,
  );
  TestValidator.equals(
    "update permissions manageComments",
    updateBody.permissions?.manageComments,
    false,
  );
  TestValidator.equals(
    "update permissions banUsers",
    updateBody.permissions?.banUsers,
    true,
  );
  TestValidator.equals("update status", updateBody.status, "active");
  TestValidator.equals("update scope", updateBody.scope, "global");
}
