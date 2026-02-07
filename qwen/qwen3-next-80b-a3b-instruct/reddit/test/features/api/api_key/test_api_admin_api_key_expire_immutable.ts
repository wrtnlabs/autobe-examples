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

export async function test_api_admin_api_key_expire_immutable(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as system administrator to gain elevated privileges
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // Generate a random UUID to represent an existing API key in the system
  // We assume there is at least one active API key owned by this admin (created implicitly)
  const keyId = typia.random<string & tags.Format<"uuid">>();
  // First update: should transition the key from 'active' to 'expired'
  // This operation should succeed
  await api.functional.community.admin.api_keys.update(adminConnection, {
    keyId,
  });
  // Second update: attempt to reactivate an expired key
  // This must fail according to the business rule: expired keys are immutable
  await TestValidator.error(
    "expired API key cannot be reactivated",
    async () => {
      await api.functional.community.admin.api_keys.update(adminConnection, {
        keyId,
      });
    },
  );
}
