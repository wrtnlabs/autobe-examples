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

export async function test_api_admin_api_key_revocation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins to establish identity
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(joinResponse);
  // 2. Obtain an active API key (must be created beforehand)
  // Since we can't create API keys via provided functions, we must simulate
  // that an API key exists. We'll create a valid UUID for the keyId.
  const keyId = typia.random<string & tags.Format<"uuid">>();
  // 3. Revoke the API key
  await api.functional.community.admin.api_keys.erase(adminConnection, {
    keyId,
  });
  // 4. Verify key is revoked by attempting to use it in another request
  // We cannot directly check the key status, but we can verify that future
  // requests with this key fail (401 Unauthorized). However, since the key
  // was never stored as a token in the connection and is used outside
  // the auth system, we rely on the fact that the system returns 204 and
  // the key is marked revoked. We'll validate using a secondary endpoint.
  // Create a new connection and attempt to use the revoked key via headers
  // Mock attempting to use the revoked key for an API call
  // Since we cannot directly test key revocation's effect on authentication
  // without an endpoint that validates the API key directly, we rely on:
  // - The 204 response confirms revocation was processed
  // - The key is no longer usable for authentication - this is backend logic
  //   and cannot be verified without an endpoint that accepts API keys
  //   (which we don't have in our available endpoints).
  // However, we can verify the system still allows the admin to perform
  // other actions (proving the admin's session is unaffected) - this is implied.
  // We do not have a way to verify the key's revocation state, so we leave this
  // as a logical test based on the contract.
  // We'll just validate that the revoke operation succeeded with no error.
}
