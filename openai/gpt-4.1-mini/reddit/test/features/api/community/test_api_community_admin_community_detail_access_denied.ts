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

/**
 * Test access denial when retrieving community details without admin authentication.
 *
 * It attempts to call the protected community detail endpoint without providing
 * any auth token or with an invalid auth token, expecting 403 Forbidden errors.
 * The test verifies that the system correctly enforces admin authorization and
 * prevents unauthorized access.
 */
export async function test_api_community_admin_community_detail_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. No authentication connection
  const noAuthConnection: api.IConnection = { host: connection.host };
  // 2. Compose a random UUID to simulate a communityId
  const randomCommunityId = typia.random<
    string & import("typia").tags.Format<"uuid">
  >();
  // 3. Call the endpoint without authentication, expect access denied error
  await TestValidator.httpError(
    "access denied: community detail without auth",
    403,
    async () => {
      await api.functional.communityPlatform.admin.communities.at(
        noAuthConnection,
        {
          communityId: randomCommunityId,
        },
      );
    },
  );
  // 4. Call the endpoint with invalid token, simulate by adding wrong Authorization header
  const invalidAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid-token" },
  };
  await TestValidator.httpError(
    "access denied: community detail with invalid token",
    403,
    async () => {
      await api.functional.communityPlatform.admin.communities.at(
        invalidAuthConnection,
        {
          communityId: randomCommunityId,
        },
      );
    },
  );
}
