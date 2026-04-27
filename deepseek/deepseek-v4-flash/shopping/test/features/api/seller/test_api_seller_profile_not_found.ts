import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that querying a seller profile with a nonexistent UUID returns 404.
 *
 * Validates the business rule that seller profiles do not leak information about nonexistent sellers. The endpoint is publicly accessible without authentication, and returns 404 Not Found when the seller ID does not correspond to any active seller account.
 *
 * The test generates a random UUID that does not correspond to any existing seller and expects the API to return a 404 HTTP error. This ensures proper handling of invalid/nonexistent seller identifiers without leaking information.
 *
 * 1. Generate a random UUID that does not match any existing seller.
 * 2. Call GET /administrator/sellers/{sellerId}/profile with the fake UUID.
 * 3. Assert that the call throws 404 Not Found.
 */
export async function test_api_seller_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any existing seller
  const fakeSellerId = typia.random<string & tags.Format<"uuid">>();
  // Expect 404 Not Found when querying a nonexistent seller
  await TestValidator.httpError(
    "nonexistent seller returns 404",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.sellers.profile.at(
        connection,
        {
          sellerId: fakeSellerId,
        },
      );
    },
  );
}
