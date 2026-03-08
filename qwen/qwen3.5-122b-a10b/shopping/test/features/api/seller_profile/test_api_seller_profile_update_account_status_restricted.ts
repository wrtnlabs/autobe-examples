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

/**
 * Test seller profile update is blocked by account status restrictions.
 * Validates that profile updates fail when seller has pending, suspended, or banned status.
 */
export async function test_api_seller_profile_update_account_status_restricted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account (initially pending approval)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Attempt to update seller profile while pending (should fail)
  await TestValidator.httpError(
    "pending seller cannot update profile",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.update(
        sellerConnection,
        {
          sellerId,
          body: {
            shop_name: RandomGenerator.name(),
          } satisfies IEcommerceMallSeller.IUpdate,
        },
      );
    },
  );
  // 4. Approve the seller account
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(adminConnection2, {
      sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "approval status is approved",
    approvedSeller.approval_status,
    "approved",
  );
  // 5. Suspend the seller account
  const suspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.suspend(adminConnection2, {
      sellerId,
    });
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "account status is suspended",
    suspendedSeller.account_status,
    "suspended",
  );
  // 6. Attempt to update seller profile while suspended (should fail)
  await TestValidator.httpError(
    "suspended seller cannot update profile",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.update(
        sellerConnection,
        {
          sellerId,
          body: {
            shop_name: RandomGenerator.name(),
          } satisfies IEcommerceMallSeller.IUpdate,
        },
      );
    },
  );
  // 7. Unsuspend the seller account
  const unsuspendedSeller =
    await api.functional.ecommerceMall.admin.sellers.unsuspend(
      adminConnection2,
      {
        sellerId,
      },
    );
  typia.assert(unsuspendedSeller);
  TestValidator.equals(
    "account status is active",
    unsuspendedSeller.account_status,
    "active",
  );
  // 8. Successfully update the seller profile
  const newShopName = RandomGenerator.name();
  const updatedSeller = await api.functional.ecommerceMall.admin.sellers.update(
    sellerConnection,
    {
      sellerId,
      body: { shop_name: newShopName } satisfies IEcommerceMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  TestValidator.equals(
    "shop name updated",
    updatedSeller.shop_name,
    newShopName,
  );
  // 9. Ban the seller account
  await api.functional.ecommerceMall.admin.sellers.ban(adminConnection2, {
    sellerId,
  });
  // 10. Attempt to update seller profile while banned (should fail)
  await TestValidator.httpError(
    "banned seller cannot update profile",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.update(
        sellerConnection,
        {
          sellerId,
          body: {
            shop_name: RandomGenerator.name(),
          } satisfies IEcommerceMallSeller.IUpdate,
        },
      );
    },
  );
}