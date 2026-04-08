import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies that seller storefront identity is protected and cannot be read without seller authentication.
 *
 * This test covers the access-control boundary for the storefront identity endpoint by exercising it from an unauthenticated base connection and confirming the request is rejected. The scenario ensures the operation is reserved for authenticated seller contexts and does not expose storefront data to anonymous callers.
 *
 * 1. Call the seller storefront identity endpoint using the base connection.
 * 2. Assert that the request fails with an authorization-related HTTP error.
 */
export async function test_api_seller_storefront_identity_requires_seller_auth(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.httpError(
    "seller storefront identity requires seller authentication",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.storefront_identity.at(
        connection,
      );
    },
  );
}
