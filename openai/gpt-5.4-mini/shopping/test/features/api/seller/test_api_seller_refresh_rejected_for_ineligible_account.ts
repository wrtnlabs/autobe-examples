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

export async function test_api_seller_refresh_rejected_for_ineligible_account(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that seller refresh is rejected for an ineligible account.
   *
   * 1. Register a fresh seller and capture the issued refresh token.
   * 2. Reuse the captured token against the seller refresh endpoint.
   * 3. Assert that the refresh operation is rejected when the account is no longer eligible.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) + "A1!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.error(
    "seller refresh should be rejected for an ineligible account",
    async () => {
      await api.functional.mallPlatform.auth.seller.refresh(sellerConnection, {
        body: {
          refreshToken: authorized.token.refresh,
        } satisfies IMallPlatformSeller.IRefresh,
      });
    },
  );
}
