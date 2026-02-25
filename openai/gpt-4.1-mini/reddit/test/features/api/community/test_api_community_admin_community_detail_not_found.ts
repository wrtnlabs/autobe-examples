import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_admin_community_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of a non-existent community by providing a UUID that does not correspond to any community in the database.
  // Authenticate as admin using join, then attempt to fetch community details with this invalid UUID.
  // Validate the response status is 404 Not Found with an appropriate error message indicating the community does not exist.
  // Create a new connection for admin and join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;
  // Use a random UUID which is unlikely to exist in the database
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 when community not found",
    404,
    async () => {
      await api.functional.communityPlatform.admin.communities.at(
        adminConnection,
        {
          communityId: nonExistentCommunityId,
        },
      );
    },
  );
}
