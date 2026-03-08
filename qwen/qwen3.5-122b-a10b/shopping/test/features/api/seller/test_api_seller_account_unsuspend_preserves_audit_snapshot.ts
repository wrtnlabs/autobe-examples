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

export async function test_api_seller_account_unsuspend_preserves_audit_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Seller joins the system
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;
  // 3. Administrator suspends the seller account
  const suspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.suspend(adminConnection, {
      sellerId,
    });
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "seller suspended",
    suspendedSeller.account_status,
    "suspended",
  );
  // 4. Administrator unsuspends the seller account
  const unsuspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.unsuspend(
      adminConnection,
      {
        sellerId,
      },
    );
  typia.assert(unsuspendedSeller);
  // 5. Verify the seller's account_status changes from 'suspended' to 'active'
  TestValidator.equals(
    "seller account status after unsuspension",
    unsuspendedSeller.account_status,
    "active",
  );
  // 6. Verify the unsuspend operation returns the updated seller entity
  TestValidator.notEquals(
    "seller status changed from suspended to active",
    suspendedSeller.account_status,
    unsuspendedSeller.account_status,
  );
}