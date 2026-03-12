import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnban";
import type { IShoppingMallSellerBulkUnbanDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBulkUnbanDetail";
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
import { generate_random_shopping_mall_admin_sellers_bulk_unban_bulk_unban } from "../../../generate/generate_random_shopping_mall_admin_sellers_bulk_unban_bulk_unban";
import { prepare_random_shopping_mall_seller_bulk_unban } from "../../../prepare/prepare_random_shopping_mall_seller_bulk_unban";

/**
 * Test the primary success scenario for bulk unbanning multiple seller accounts.
 *
 * This test validates that administrators can successfully restore multiple
 * banned seller accounts back to active status in a single operation.
 */
export async function test_api_seller_bulk_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Create 3 seller accounts
  const sellerCredentials: Array<{
    email: string;
    password: string;
    shopName: string;
  }> = ArrayUtil.repeat(3, (index) => ({
    email: `seller${index}@test.com`,
    password: "1234",
    shopName: `Shop ${index}`,
  }));
  const sellers: IShoppingMallSeller.IAuthorized[] = [];
  await ArrayUtil.asyncForEach(sellerCredentials, async (cred, index) => {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: cred.email,
        password: cred.password,
        shop_name: cred.shopName,
        href: "https://test.com/join",
        referrer: "https://test.com",
      },
    });
    sellers.push(seller);
  });
  // 3. Ban all 3 sellers using individual ban operations
  await ArrayUtil.asyncForEach(sellers, async (seller) => {
    const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
      adminConnection,
      {
        sellerId: seller.id,
      },
    );
    typia.assert(bannedSeller);
    TestValidator.equals(
      `seller ${seller.id} status`,
      bannedSeller.status,
      "banned",
    );
  });
  // 4. Execute bulk unban operation
  const sellerIds = sellers.map((s) => s.id);
  const bulkUnbanBody = {
    sellerIds: sellerIds,
  } satisfies IShoppingMallSellerBulkUnban.ICreate;
  const bulkUnbanResult =
    await api.functional.shoppingMall.admin.sellers.bulk_unban.bulkUnban(
      adminConnection,
      {
        body: bulkUnbanBody,
      },
    );
  typia.assert(bulkUnbanResult);
  // 5. Validate bulk unban response
  TestValidator.equals("total count", bulkUnbanResult.total, 3);
  TestValidator.equals("succeeded count", bulkUnbanResult.succeeded, 3);
  TestValidator.equals("failed count", bulkUnbanResult.failed, 0);
  // 6. Validate each detail entry
  await ArrayUtil.asyncForEach(
    bulkUnbanResult.details,
    async (detail, index) => {
      TestValidator.equals(
        `detail ${index} sellerId`,
        detail.sellerId,
        sellerIds[index],
      );
      TestValidator.predicate(`detail ${index} success`, detail.success);
      TestValidator.equals(
        `detail ${index} errorReason`,
        detail.errorReason,
        null,
      );
    },
  );
  // 7. Verify all sellers can now login (status='active')
  await ArrayUtil.asyncForEach(sellers, async (seller) => {
    const sellerConnection: api.IConnection = { host: connection.host };
    const loggedInSeller = await authorize_seller_login(sellerConnection, {
      body: {
        email: seller.email,
        password: "1234",
        href: "https://test.com/login",
        referrer: "https://test.com",
      },
    });
    typia.assert(loggedInSeller);
    TestValidator.equals(
      `seller ${seller.id} status after unban`,
      loggedInSeller.status,
      "active",
    );
  });
}
