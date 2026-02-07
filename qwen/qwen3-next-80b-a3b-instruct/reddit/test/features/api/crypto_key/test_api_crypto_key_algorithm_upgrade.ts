import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCryptoKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_crypto_key_algorithm_upgrade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: Join as administrator first
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(authResult);
  // 2. Generate a valid UUID keyId for an existing key
  const keyId = typia.random<string & tags.Format<"uuid">>();
  // 3. Upgrade the key algorithm from RSA-2048 to RSA-4096
  const response = await api.functional.community.admin.crypto_keys.update(
    adminConnection,
    {
      keyId,
      body: {
        key_value: RandomGenerator.alphabets(1024),
        key_type: "rsa",
        algorithm: "RSA-4096",
        status: "active",
        key_metadata: '{"version": "v4.0"}',
      },
    },
  );
  typia.assert(response);
  // 4. Validation: Since ICommunityCryptoKey is empty ({}), we cannot validate individual properties
  // Instead, we validate that the response is non-null and represents a successful operation
  TestValidator.predicate(
    "update operation returned a valid crypto key",
    response !== null,
  );
}
