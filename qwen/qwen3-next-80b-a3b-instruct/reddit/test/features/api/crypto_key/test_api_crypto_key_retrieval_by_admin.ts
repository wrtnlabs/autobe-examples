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
import { generate_random_community_admin_crypto_keys_create } from "../../../generate/generate_random_community_admin_crypto_keys_create";
import { prepare_random_community_crypto_key } from "../../../prepare/prepare_random_community_crypto_key";

export async function test_api_crypto_key_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Create a cryptographic key to test retrieval using utility function
  const createResponse =
    await generate_random_community_admin_crypto_keys_create(adminConnection, {
      body: typia.random<ICommunityCryptoKey.ICreate>(),
    });
  // Cast to IEntity to access id property which should be present based on API behavior
  // Even though ICommunityCryptoKey is defined as empty, the API must return an id
  const createdKey = typia.assert<ICommunityCryptoKey & IEntity>(
    createResponse,
  );
  // 3. Retrieve the created key by its ID (now we can access id via IEntity)
  const retrievedKey = await api.functional.community.admin.crypto_keys.at(
    adminConnection,
    {
      keyId: createdKey.id,
    },
  );
  const retrievedKeyTyped = typia.assert<ICommunityCryptoKey & IEntity>(
    retrievedKey,
  );
  // 4. Validate that the retrieved key matches the created key
  TestValidator.equals(
    "retrieved key ID matches created key ID",
    retrievedKeyTyped.id,
    createdKey.id,
  );
  // 5. Verify the API returns 404 for non-existent key
  await TestValidator.error(
    "should return 404 for non-existent key",
    async () => {
      const invalidKeyId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.community.admin.crypto_keys.at(adminConnection, {
        keyId: invalidKeyId,
      });
    },
  );
}
