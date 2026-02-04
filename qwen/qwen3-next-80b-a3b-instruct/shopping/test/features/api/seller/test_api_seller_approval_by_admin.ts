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
export async function test_api_seller_approval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and join as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
  };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCreds },
  );
  // Step 2: Generate a random sellerId (since seller registration endpoint doesn't exist)
  // We need this for the approve endpoint, and we cannot create a seller
  // per the available API functions, so we generate a UUID
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Approve the seller application
  const approvedSeller: IShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.approve.update(
      adminConnection,
      {
        sellerId,
      },
    );
  // Step 4: Validate the approval result
  typia.assert(approvedSeller);
  TestValidator.equals(
    "approved seller ID matches",
    approvedSeller.sellerId,
    sellerId,
  );
}
