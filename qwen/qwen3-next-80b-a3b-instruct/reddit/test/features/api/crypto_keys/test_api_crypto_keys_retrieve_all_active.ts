import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCryptoKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCryptoKey";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_crypto_keys_retrieve_all_active(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as system admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // Retrieve all active cryptographic keys
  const response = await api.functional.community.admin.crypto_keys.index(
    adminConnection,
    {
      body: {} satisfies ICommunityCryptoKey.IRequest,
    },
  );
  typia.assert(response);
  // Validate response structure - pagination
  TestValidator.equals("pagination exists", response.pagination, {
    current: 1,
    limit: response.pagination.limit,
    records: response.pagination.records,
    pages:
      response.pagination.records > 0
        ? Math.ceil(response.pagination.records / response.pagination.limit)
        : 0,
  } satisfies IPage.IPagination);
  // Validate response structure - data array
  TestValidator.predicate("data array not empty", response.data.length > 0);
  // Validate each key in data array
  for (const key of response.data) {
    // Ensure key_value is NOT present (security requirement)
    TestValidator.predicate("key_value not present", !("key_value" in key));
  }
}
