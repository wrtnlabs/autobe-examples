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
 * Verifies that an authenticated seller receives a not-found error when the storefront identity profile cannot be resolved.
 *
 * This scenario covers the seller-facing storefront identity endpoint and ensures that the server does not silently fall back to another seller profile or return stale storefront data when the authenticated seller profile is missing.
 *
 * 1. A new seller account is created through the seller join utility.
 * 2. The authenticated seller then requests the storefront identity endpoint.
 * 3. The request must fail with a not-found HTTP error instead of returning storefront data.
 */
export async function test_api_seller_storefront_identity_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  await TestValidator.httpError(
    "seller storefront identity should fail when seller profile is not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.storefront_identity.at(
        sellerConnection,
      );
    },
  );
}
