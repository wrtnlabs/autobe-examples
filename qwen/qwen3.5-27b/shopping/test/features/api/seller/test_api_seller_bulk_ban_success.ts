import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

/**
 * Test bulk ban success scenario for multiple seller accounts.
 *
 * This test validates the primary success path where an authenticated admin
 * successfully bans multiple active seller accounts in a single operation.
 * The test creates 3 seller accounts, bans them all, and verifies that:
 * - The bulk ban operation reports all sellers as successfully banned
 * - Banned sellers cannot authenticate to the system
 */
export async function test_api_seller_bulk_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create 3 test seller accounts with tracked passwords
  const password1 = RandomGenerator.alphaNumeric(16);
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: { password: password1 },
  });
  typia.assert(seller1);
  const password2 = RandomGenerator.alphaNumeric(16);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: { password: password2 },
  });
  typia.assert(seller2);
  const password3 = RandomGenerator.alphaNumeric(16);
  const seller3Connection: api.IConnection = { host: connection.host };
  const seller3 = await authorize_seller_join(seller3Connection, {
    body: { password: password3 },
  });
  typia.assert(seller3);
  // 3. Prepare bulk ban request
  const banRequest = {
    sellerIds: [seller1.id, seller2.id, seller3.id],
    reason: "Test bulk ban operation",
  } satisfies IShoppingMallSeller.IBulkBan;
  // 4. Execute bulk ban operation
  const banResult =
    await api.functional.shoppingMall.admin.sellers.bulk_ban.bulkBan(
      adminConnection,
      { body: banRequest },
    );
  typia.assert(banResult);
  // 5. Verify bulk ban result
  TestValidator.equals("success count", banResult.successCount, 3);
  TestValidator.equals("failed array empty", banResult.failed.length, 0);
  // 6. Verify banned sellers cannot login (should throw HTTP error)
  await TestValidator.httpError(
    "seller1 cannot login after ban",
    [401, 403],
    async () => {
      const testConnection: api.IConnection = { host: connection.host };
      await authorize_seller_login(testConnection, {
        body: {
          email: seller1.email,
          password: password1,
          href: "https://test.com",
          referrer: "https://test.com",
        },
      });
    },
  );
  await TestValidator.httpError(
    "seller2 cannot login after ban",
    [401, 403],
    async () => {
      const testConnection: api.IConnection = { host: connection.host };
      await authorize_seller_login(testConnection, {
        body: {
          email: seller2.email,
          password: password2,
          href: "https://test.com",
          referrer: "https://test.com",
        },
      });
    },
  );
  await TestValidator.httpError(
    "seller3 cannot login after ban",
    [401, 403],
    async () => {
      const testConnection: api.IConnection = { host: connection.host };
      await authorize_seller_login(testConnection, {
        body: {
          email: seller3.email,
          password: password3,
          href: "https://test.com",
          referrer: "https://test.com",
        },
      });
    },
  );
}
