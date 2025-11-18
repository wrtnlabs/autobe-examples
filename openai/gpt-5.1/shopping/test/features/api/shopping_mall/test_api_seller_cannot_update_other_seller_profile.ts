import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_seller_cannot_update_other_seller_profile(
  connection: api.IConnection,
) {
  // 1. Register Seller A and capture its authorized context
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  const sellerAId = sellerA.id;

  // 2. Register Seller B and capture its authorized context (this call will overwrite connection headers)
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  const sellerBId = sellerB.id;

  // 3. Re-authenticate as Seller A so that connection carries Seller A token
  const sellerARejoinBody = {
    email: sellerAJoinBody.email,
    password: sellerAJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAReAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerARejoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAReAuth);

  TestValidator.equals(
    "re-authenticated seller A should have same id",
    sellerAReAuth.id,
    sellerAId,
  );

  // 4. Attempt to update Seller B's profile while authenticated as Seller A
  const updatePayload = {
    store_name: RandomGenerator.paragraph({ sentences: 3 }),
    store_description: RandomGenerator.paragraph({ sentences: 5 }),
    support_email: typia.random<string & tags.Format<"email">>(),
    support_phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerProfile.IUpdate;

  await TestValidator.httpError(
    "seller A cannot update seller B profile",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.sellers.profile.update(
        connection,
        {
          sellerId: sellerBId,
          body: updatePayload,
        },
      );
    },
  );
}
