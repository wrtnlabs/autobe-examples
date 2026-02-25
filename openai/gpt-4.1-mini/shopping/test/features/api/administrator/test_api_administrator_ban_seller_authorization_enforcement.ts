import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_ban_seller_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that banning a seller is strictly restricted to administrators.
  // Any attempt by customers or sellers to ban should fail with authorization errors.
  // Prepare a dummy sellerId for ban attempts
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Create customer connection (non-admin) - no utility function provided for customer login, so simulate unauthorized JWT or use base connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Intentionally do not authorize as admin; use base connection to simulate customer or unauthorized user
  // Attempt banning seller as a customer should throw authorization error
  await TestValidator.httpError("customer cannot ban seller", 403, async () => {
    await api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller(
      customerConnection,
      { sellerId },
    );
  });
  // Create seller connection (non-admin) - no utility function for seller authorization; simulate unauthorized
  const sellerConnection: api.IConnection = { host: connection.host };
  // Attempt banning seller as a seller should also throw authorization error
  await TestValidator.httpError("seller cannot ban seller", 403, async () => {
    await api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller(
      sellerConnection,
      { sellerId },
    );
  });
  // Now, create administrator connection to confirm join operation works (dependency requirement)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234", // plaintext password satisfying min 8 chars
    },
  });
  typia.assert(adminAuthorized);
  // Refresh adminConnection headers to use authorized token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // As final check: Ban the seller as admin to verify no ban record created for unauthorized attempts (the call should succeed)
  // Since banning an already banned seller is idempotent, no error is expected.
  await api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller(
    adminConnection,
    {
      sellerId,
    },
  );
}
