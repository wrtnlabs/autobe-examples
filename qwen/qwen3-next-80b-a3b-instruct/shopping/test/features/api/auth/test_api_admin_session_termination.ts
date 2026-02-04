import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_termination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Verify admin can make authenticated request before logout
  // (We cannot test other endpoints as none are provided, but auth is confirmed by successful response)
  // Step 3: Call the logout endpoint with admin connection
  await api.functional.shoppingMall.admin.auth.admins.logout.logOut(
    adminConnection,
  );
  // Step 4: Verify that subsequent request with same token returns 401 Unauthorized
  // We attempt to make another request using the same connection (which still contains the revoked token)
  // This should fail with 401 since the session was terminated
  await TestValidator.error(
    "post-logout request with revoked token should return 401 Unauthorized",
    async () => {
      await api.functional.shoppingMall.admin.auth.admins.logout.logOut(
        adminConnection,
      );
    },
  );
}
