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

export async function test_api_moderator_retrieve_info_as_admin(
  connection: api.IConnection,
): Promise<void> {
  // This test authenticates as an admin user and retrieves moderator information by moderatorId
  // Setup admin actor connection and join an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Use the authorized admin connection
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuthorized.token.access,
  };
  // Generate a random UUID for moderatorId (best effort, no guarantee this ID exists)
  const moderatorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve moderator information
  const moderatorInfo = await api.functional.communityPlatform.moderators.at(
    adminConnection,
    {
      moderatorId,
    },
  );
  typia.assert(moderatorInfo);
  // Assert that the result is an object (ICommunityPlatformModerator has no defined properties)
  TestValidator.predicate(
    "moderatorInfo is a non-null object",
    typeof moderatorInfo === "object" && moderatorInfo !== null,
  );
}
