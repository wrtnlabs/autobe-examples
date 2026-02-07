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

export async function test_api_crypto_key_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Since ICommunityCryptoKey is {} (empty object) as per provided DTO definition,
  //    we must use an empty object for both request and response.
  //    All properties mentioned in the scenario are part of the API contract
  //    but are not modeled in the DTO type definition.
  //    Therefore, we use an empty object as required by the TypeScript type system.
  const keyId = typia.random<string & tags.Format<"uuid">>();
  const body: ICommunityCryptoKey = {};
  // 3. Update the crypto key with empty object (as per type definition)
  const updatedKey = await api.functional.community.admin.crypto_keys.update(
    adminConnection,
    {
      keyId,
      body,
    },
  );
  typia.assert(updatedKey);
  // 4. Since ICommunityCryptoKey is {} and typia.assert() validates the complete structure,
  //    no additional validation is needed per rule 8.2.
  //    Testing individual properties would require assumptions beyond the type system.
  //    This test verifies that the API accepts and returns a valid response with an empty object.
}
