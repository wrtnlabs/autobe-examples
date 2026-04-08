import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test that a seller cannot retrieve another seller's administrator promotion request (authorization check).
 *
 * Validates that the shopping mall platform enforces proper authorization boundaries between seller accounts. When seller B attempts to access seller A's administrator promotion request, the system should reject the request with a 403 Forbidden HTTP error. This ensures that sellers can only view their own administrator requests and cannot access other sellers' sensitive administrative data.
 *
 * The test creates two separate seller accounts, has the first seller submit an administrator promotion request, then attempts to retrieve that request using the second seller's credentials. The authorization failure confirms that the platform correctly implements ownership-based access control for administrator requests.
 *
 * 1. Register seller A with randomized credentials using the seller join endpoint.
 * 2. Submit an administrator promotion request as seller A with a justification reason.
 * 3. Register seller B with different randomized credentials.
 * 4. Attempt to retrieve seller A's administrator request using seller B's authenticated connection.
 * 5. Verify that the retrieval attempt fails with HTTP 403 Forbidden status code.
 */
export async function test_api_administrator_request_retrieve_another_seller_request_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // 2. Submit administrator promotion request as seller A
  const request =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerAConnection,
      {},
    );
  typia.assert(request);
  // 3. Register seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // 4. Verify seller A and seller B are different accounts
  TestValidator.notEquals("sellers are different", sellerA.id, sellerB.id);
  // 5. Attempt to retrieve seller A's request as seller B (should fail with 403)
  await TestValidator.httpError(
    "seller B cannot access seller A's administrator request",
    403,
    async () =>
      await api.functional.shoppingMall.seller.administrator_requests.at(
        sellerBConnection,
        {
          administratorRequestId: request.id,
        },
      ),
  );
}
