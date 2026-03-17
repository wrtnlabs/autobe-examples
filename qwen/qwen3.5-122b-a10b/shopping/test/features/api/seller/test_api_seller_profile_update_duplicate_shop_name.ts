import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_update_duplicate_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Create first seller account
  const firstSellerEmail = typia.random<string & tags.Format<"email">>();
  const firstSellerPassword = RandomGenerator.alphaNumeric(16);
  const firstSellerOriginalShopName = RandomGenerator.name();
  const firstSellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: firstSellerEmail,
      password: firstSellerPassword,
      shop_name: firstSellerOriginalShopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(firstSellerJoinResult);
  const firstSellerId = firstSellerJoinResult.seller.id;
  // 4. Create second seller account
  const secondSellerEmail = typia.random<string & tags.Format<"email">>();
  const secondSellerPassword = RandomGenerator.alphaNumeric(16);
  const secondSellerOriginalShopName = RandomGenerator.name();
  const secondSellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: secondSellerEmail,
      password: secondSellerPassword,
      shop_name: secondSellerOriginalShopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(secondSellerJoinResult);
  const secondSellerId = secondSellerJoinResult.seller.id;
  // 5. Approve first seller as admin
  const firstSellerApproved =
    await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
      sellerId: firstSellerId,
    });
  typia.assert(firstSellerApproved);
  // 6. Approve second seller as admin
  const secondSellerApproved =
    await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
      sellerId: secondSellerId,
    });
  typia.assert(secondSellerApproved);
  // 7. Update first seller's profile with a unique shop name
  const uniqueShopName = RandomGenerator.name();
  const firstSellerUpdated =
    await api.functional.ecommerceMall.admin.sellers.update(adminConnection, {
      sellerId: firstSellerId,
      body: {
        shop_name: uniqueShopName,
      } satisfies IEcommerceMallSeller.IUpdate,
    });
  typia.assert(firstSellerUpdated);
  TestValidator.equals(
    "first seller shop name updated",
    firstSellerUpdated.shop_name,
    uniqueShopName,
  );
  // 8. Attempt to update second seller's profile with the same shop name (should fail with 409)
  await TestValidator.httpError(
    "duplicate shop name should return 409 Conflict",
    409,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.update(adminConnection, {
        sellerId: secondSellerId,
        body: {
          shop_name: uniqueShopName,
        } satisfies IEcommerceMallSeller.IUpdate,
      });
    },
  );
  // 9. Verify second seller's profile remains unchanged
  const secondSellerUpdated =
    await api.functional.ecommerceMall.admin.sellers.update(adminConnection, {
      sellerId: secondSellerId,
      body: {
        shop_description: secondSellerJoinResult.shop_description,
      } satisfies IEcommerceMallSeller.IUpdate,
    });
  typia.assert(secondSellerUpdated);
  TestValidator.equals(
    "second seller shop name unchanged",
    secondSellerUpdated.shop_name,
    secondSellerOriginalShopName,
  );
}