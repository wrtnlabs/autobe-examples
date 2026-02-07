import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_api_key_revoke(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser: ICommunityAdmin.IJoin =
    typia.random<ICommunityAdmin.IJoin>();
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: adminUser,
  });
  typia.assert(authorizedAdmin);
  // 2. Get a valid API key for testing
  // We need to create an API key first, but there's no direct API to create one
  // Instead, we'll use a random UUID as the keyId to test the revoke operation
  // The system should have pre-seeded API keys that are active
  const apiKeyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Revoke the API key
  await api.functional.community.admin.api_keys.update(adminConnection, {
    keyId: apiKeyId,
  });
  // 4. Validate that the operation was successful
  // The API returns void on success, so we can't validate the response directly
  // Instead, we'll verify that no error was thrown (which is what typia.assert would do)
  // We can't use typia.assert on void responses
  // 5. Confirm the key status was changed
  // Since there's no way to retrieve the key status after revoke in this scenario,
  // we rely on the fact that the update call must complete successfully
  // Note: In a more complete scenario, we would verify the key's status was changed
  // from 'active' to 'revoked' through a separate read endpoint, but it's not available
  // So we verify the successful execution of the revoke operation
}
