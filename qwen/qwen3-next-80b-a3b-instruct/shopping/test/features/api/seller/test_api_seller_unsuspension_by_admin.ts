import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_unsuspension_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super admin to perform administrative actions
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Step 2: Generate a fake sellerId (assuming the system has pre-seeded seller data)
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Admin suspends the seller
  const suspendResponse: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.admins.sellers.suspend(
      adminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(suspendResponse);
  TestValidator.equals(
    "seller is now suspended",
    suspendResponse.is_suspended,
    true,
  );
  // Step 4: Admin unsuspends the seller
  const unsuspendResponse: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.admins.sellers.unsuspend.update(
      adminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(unsuspendResponse);
  TestValidator.equals(
    "seller is now active",
    unsuspendResponse.is_suspended,
    false,
  );
  // Step 5: Verify unsuspension fails on non-suspended seller
  await TestValidator.error(
    "unsuspension should fail on already active seller",
    async () => {
      await api.functional.shoppingMall.admin.admins.sellers.unsuspend.update(
        adminConnection,
        {
          sellerId: sellerId,
        },
      );
    },
  );
}
