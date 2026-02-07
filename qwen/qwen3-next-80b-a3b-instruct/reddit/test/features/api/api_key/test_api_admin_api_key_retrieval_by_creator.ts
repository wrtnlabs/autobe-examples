import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityApiKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_api_key_retrieval_by_creator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(admin);
  // 2. Create new API key as the administrator using POST /community/admin/api-keys
  // However, no create endpoint function exists in the provided SDK functions.
  // Since we cannot create an API key, we must test retrieval of a non-existent key.
  // Generate a random UUID for a non-existent keyId.
  const nonExistentKeyId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent API key
  // This should fail with a 404 error because the key doesn't exist
  const keyId = nonExistentKeyId;
  await TestValidator.httpError(
    "retrieving non-existent API key should return 404",
    404,
    async () => {
      await api.functional.community.admin.api_keys.at(adminConnection, {
        keyId,
      });
    },
  );
  // The original scenario required retrieval after creation.
  // We cannot fulfill it because the create function is not available.
  // We test the retrieval endpoint by trying an invalid key.
  // This validates the endpoint's error response.
}
