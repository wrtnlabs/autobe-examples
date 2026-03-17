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

export async function test_api_admin_seller_suspension_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login admin for subsequent calls
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create seller account (initially pending approval)
  const sellerEmail = typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerShopName = RandomGenerator.name();
  const sellerAuth = await authorize_seller_join(adminConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: sellerShopName,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Approve seller to enable selling capabilities
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(
      adminLoginConnection,
      { sellerId },
    );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status after approval",
    approvedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller account status before suspension",
    approvedSeller.account_status,
    "active",
  );
  // 4. Suspend seller for policy violations
  const suspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.suspend(
      adminLoginConnection,
      { sellerId },
    );
  typia.assert(suspendedSeller);
  // 5. Verify account_status changed to suspended
  TestValidator.equals(
    "account status after suspension",
    suspendedSeller.account_status,
    "suspended",
  );
  TestValidator.equals(
    "approval status unchanged after suspension",
    suspendedSeller.approval_status,
    "approved",
  );
  TestValidator.notEquals(
    "account status changed",
    suspendedSeller.account_status,
    approvedSeller.account_status,
  );
  // 6. Verify suspended seller can still login (suspended sellers retain access for order processing)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  TestValidator.equals(
    "suspended seller can still login",
    sellerLogin.account_status,
    "suspended",
  );
  TestValidator.equals(
    "suspended seller shop name preserved",
    sellerLogin.shop_name,
    sellerShopName,
  );
  // 7. Verify seller details remain consistent after suspension
  TestValidator.equals("seller ID preserved", sellerLogin.id, sellerId);
}