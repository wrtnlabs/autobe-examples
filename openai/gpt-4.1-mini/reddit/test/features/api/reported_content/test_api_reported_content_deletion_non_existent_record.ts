import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reported_content_deletion_non_existent_record(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion of a non-existent reported content record by an authorized admin user.
  // 1. Register an admin user
  // 2. Use admin auth to attempt to delete a random non-existent reported content ID
  // 3. Validate that the operation fails with HTTP 404 error
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: undefined,
  });
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting non-existent reported content returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.reportedContents.erase(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
}
