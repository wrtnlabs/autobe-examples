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

export async function test_api_admin_auth_token_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Verify admin connection has proper authorization headers
  TestValidator.predicate(
    "admin connection has authorization header",
    adminConnection.headers?.Authorization !== undefined,
  );
  // Attempt to delete a non-existent authentication token
  const nonExistentTokenId = typia.random<string & tags.Format<"uuid">>();
  // Validate 404 Not Found response for non-existent token
  await TestValidator.httpError(
    "delete non-existent auth token should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.auth_tokens.erase(
        adminConnection,
        {
          authTokenId: nonExistentTokenId,
        },
      );
    },
  );
}
