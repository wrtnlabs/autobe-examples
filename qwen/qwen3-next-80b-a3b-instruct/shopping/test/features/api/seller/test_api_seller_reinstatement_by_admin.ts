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
export async function test_api_seller_reinstatement_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Step 2: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 3: Generate a seller ID
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Suspend the seller as admin
  await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
    sellerId,
  });
  // Step 5: Reinstating the suspended seller
  const reinstatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
      sellerId,
    });
  typia.assert(reinstatedSeller);
  // Step 6: Validate reinstatement
  TestValidator.equals(
    "seller status is active",
    reinstatedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller is not suspended",
    reinstatedSeller.is_suspended,
    false,
  );
}
