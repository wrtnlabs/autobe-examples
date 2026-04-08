import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of a seller that does not exist.
 * Admin authenticates and attempts to retrieve a seller using a non-existent
 * seller ID (random UUID). The system should return HTTP 404 Not Found error,
 * indicating the seller record cannot be found in the ecommerce_mall_sellers table.
 */
export async function test_api_seller_retrieval_not_found_non_existent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate a random non-existent seller ID (UUID)
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent seller and expect 404 Not Found
  await TestValidator.httpError(
    "retrieving non-existent seller returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.at(adminConnection, {
        sellerId: nonExistentSellerId,
      });
    },
  );
}
