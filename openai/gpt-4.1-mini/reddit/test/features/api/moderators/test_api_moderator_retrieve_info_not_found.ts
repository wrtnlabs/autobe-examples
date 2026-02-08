import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderator_retrieve_info_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize admin
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  // Attach token to adminConnection
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Generate random UUID that should not exist
  const fakeModeratorId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to get moderator details with non-existent ID and expect 404 error
  await TestValidator.httpError(
    "retrieve non-existent moderator returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderators.at(adminConnection, {
        moderatorId: fakeModeratorId,
      });
    },
  );
}
