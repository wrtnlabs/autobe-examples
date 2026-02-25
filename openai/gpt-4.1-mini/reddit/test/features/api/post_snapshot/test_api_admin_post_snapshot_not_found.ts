import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_post_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join to create admin account and get adminConnection with auth header
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(connection, {});
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Use a random UUID that does not exist as snapshot ID
  const fakeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Try fetching non-existing post snapshot by admin and expect HttpError 404
  await TestValidator.httpError(
    "should return 404 Not Found for non-existing post snapshot",
    404,
    async () => {
      await api.functional.communityPlatform.admin.postSnapshots.at(
        adminConnection,
        { id: fakeId },
      );
    },
  );
  // 4. Verify unauthorized access is blocked similar for missing token
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should block access without authorization",
    401,
    async () => {
      await api.functional.communityPlatform.admin.postSnapshots.at(
        unauthConnection,
        { id: fakeId },
      );
    },
  );
}
