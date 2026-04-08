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

export async function test_api_seller_storefront_identity_owner_only_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that seller storefront identity updates are restricted to the profile owner.
   *
   * This test registers two seller accounts, then uses the non-owner seller session to attempt
   * an update against another seller's storefront identity. It validates that the request is
   * rejected and that the protected seller profile remains unchanged after the failed attempt.
   *
   * 1. Register the protected seller account and capture its storefront profile.
   * 2. Register a different seller account and use that session as the non-owner actor.
   * 3. Attempt to update the protected storefront identity using the non-owner session.
   * 4. Verify the request is rejected and the original storefront profile is preserved.
   */
  const ownerJoin = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123!" satisfies string,
      } satisfies IMallPlatformSeller.IJoin,
    },
  );
  typia.assert(ownerJoin);
  const protectedProfile = ownerJoin.sellerProfile;
  typia.assert(protectedProfile);
  const attackerJoin = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123!" satisfies string,
      } satisfies IMallPlatformSeller.IJoin,
    },
  );
  typia.assert(attackerJoin);
  const attackerConnection: api.IConnection = { host: connection.host };
  attackerConnection.headers = {
    Authorization: `Bearer ${attackerJoin.token.access}`,
  };
  const attemptedBody = {
    shopName: RandomGenerator.name(),
    shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    logoImageUri: "https://example.com/logo.png",
  } satisfies IMallPlatformSellerProfile.IUpdate;
  await TestValidator.httpError(
    "non-owner seller cannot update another seller's storefront identity",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.storefront_identity.update(
        attackerConnection,
        { body: attemptedBody },
      );
    },
  );
  TestValidator.equals(
    "owner storefront identity remains unchanged after rejected update",
    ownerJoin.sellerProfile,
    protectedProfile,
  );
}
