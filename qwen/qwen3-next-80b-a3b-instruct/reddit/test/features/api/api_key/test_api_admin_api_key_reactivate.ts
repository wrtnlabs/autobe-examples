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

export async function test_api_admin_api_key_reactivate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as system administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Generate a random API key ID (must refer to an existing revoked key)
  // Using random UUID as we have no key creation endpoint in the provided APIs
  // This assumes the test environment contains at least one revoked key
  const keyId = typia.random<string & tags.Format<"uuid">>();
  // 3. Reactivate the previously revoked API key
  // This endpoint is PUT /community/admin/api-keys/{keyId} with no request body
  // Returns 204 No Content on success
  await api.functional.community.admin.api_keys.update(adminConnection, {
    keyId,
  });
}
