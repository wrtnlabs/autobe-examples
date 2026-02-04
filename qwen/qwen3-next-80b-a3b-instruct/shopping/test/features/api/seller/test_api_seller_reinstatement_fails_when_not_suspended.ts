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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_reinstatement_fails_when_not_suspended(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via join (registration)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        href: connection.host,
        referrer: "", // Use empty string to satisfy string & Format<"uri">; empty string is valid URI
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
      },
    },
  );
  typia.assert(admin);
  // Step 2: Create seller account via join (registration, status: pending_verification)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(sellerJoinResponse);
  const sellerId = sellerJoinResponse.seller_id;
  // Step 3: Login as admin to perform administrative operation using the same password from join
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_login(adminLoginConnection, {
      body: {
        email: admin.email,
        password: adminPassword,
      },
    });
  typia.assert(adminLogin);
  // Step 4: Attempt to reinstate the seller account (which is in pending_verification status, not suspended)
  // According to the business rule: reinstatement is only allowed for suspended sellers.
  // The seller is pending_verification, which is not suspended, so this should fail with 400.
  await TestValidator.httpError(
    "reinstating non-suspended seller should fail",
    400, // This is the expected status for a failed reinstatement attempt on non-suspended seller
    async () => {
      await api.functional.shoppingMall.admin.sellers.update(
        adminLoginConnection,
        {
          sellerId,
        },
      );
    },
  );
}