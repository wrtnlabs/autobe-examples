import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieves non-existent admin request returns 404.
 *
 * Validates that when a seller attempts to retrieve an admin request using a
 * non-existent UUID, the system properly returns a 404 Not Found response.
 * This ensures proper error handling for invalid request identifiers and
 * maintains security by not exposing whether any admin requests exist in the
 * database.
 *
 * The test flow:
 * 1. Register a new seller account via POST /ecommerceMall/auth/seller/join
 * 2. Authenticate the seller (authorize_seller_join handles this)
 * 3. Attempt to retrieve admin request with non-existent UUID
 * 4. Validate 404 Not Found response is returned
 */
export async function test_api_seller_admin_request_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Attempt to retrieve admin request with non-existent UUID
  const nonExistentRequestId = "00000000-0000-0000-0000-000000000000";
  // 3. Validate 404 Not Found response
  await TestValidator.httpError(
    "non-existent admin request returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.sellers.me.admin_requests.at(
        sellerConnection,
        {
          requestId: nonExistentRequestId as string & tags.Format<"uuid">,
        },
      ),
  );
}
