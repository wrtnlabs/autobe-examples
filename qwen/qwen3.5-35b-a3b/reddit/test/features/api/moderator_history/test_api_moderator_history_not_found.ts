import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test error handling when retrieving a non-existent moderator history record.
 * Validates 404 response for invalid history ID.
 */
export async function test_api_moderator_history_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: typia.random<IRedditPlatformAdmin.IJoin>(),
    },
  );
  typia.assert(admin);
  // 2. Generate a random UUID that doesn't exist
  const historyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent history using adminConnection
  // - should return 404 Not Found error
  await TestValidator.httpError(
    "returns 404 for non-existent history",
    404,
    async () => {
      await api.functional.redditPlatform.admin.histories.at(adminConnection, {
        historyId,
      });
    },
  );
}
