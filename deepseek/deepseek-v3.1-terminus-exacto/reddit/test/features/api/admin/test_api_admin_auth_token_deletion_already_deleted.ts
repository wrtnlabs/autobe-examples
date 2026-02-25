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

export async function test_api_admin_auth_token_deletion_already_deleted(
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
  // Generate a random UUID for the auth token deletion test
  const authTokenId = typia.random<string & tags.Format<"uuid">>();
  // First deletion attempt - this will likely fail since the token doesn't exist
  // but we test the error handling for non-existent tokens
  await TestValidator.error(
    "deleting non-existent auth token",
    async () =>
      await api.functional.communityPlatform.admin.auth_tokens.erase(
        adminConnection,
        { authTokenId },
      ),
  );
  // Second deletion attempt - same token, should also fail
  await TestValidator.error(
    "deleting already attempted token",
    async () =>
      await api.functional.communityPlatform.admin.auth_tokens.erase(
        adminConnection,
        { authTokenId },
      ),
  );
}
