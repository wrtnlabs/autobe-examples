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

export async function test_api_seller_unsuspend_restore_selling_capabilities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@ecommerce.com",
      password: "admin123",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@seller.com`,
      password: "seller123",
      href: "https://example.com",
      referrer: "test",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "seller123",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Admin suspends the seller
  const suspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.suspend.suspendSeller(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        body: {
          reason: "Test suspension for unsuspend workflow",
        } satisfies IEcommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "seller is suspended",
    suspendedSeller.is_suspended,
    true,
  );
  // 4. Admin unsuspends the seller (TARGET API)
  const unsuspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.unsuspend(
      adminConnection,
      {
        sellerId: sellerAuth.id,
      },
    );
  typia.assert(unsuspendedSeller);
  TestValidator.equals(
    "seller is unsuspended",
    unsuspendedSeller.is_suspended,
    false,
  );
}
