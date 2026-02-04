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
export async function test_api_admin_registration_unauthorized_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminJoinResponse = await authorize_admin_join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(superAdminJoinResponse);
  TestValidator.equals(
    "super admin registration successful",
    superAdminJoinResponse.adminType,
    "super",
  );
  // Step 2: Create and authenticate a regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  const regularAdminPassword = RandomGenerator.alphaNumeric(16);
  const regularAdminJoinResponse = await authorize_admin_join(
    regularAdminConnection,
    {
      body: {
        email: regularAdminEmail,
        password: regularAdminPassword,
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(regularAdminJoinResponse);
  TestValidator.equals(
    "regular admin registration successful",
    regularAdminJoinResponse.adminType,
    "regular",
  );
  // Step 3: Authenticate as the regular administrator to obtain a session token
  const regularAdminLoginResponse = await authorize_admin_login(
    regularAdminConnection,
    {
      body: {
        email: regularAdminEmail,
        password: regularAdminPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(regularAdminLoginResponse);
  // Step 4: Regular admin attempts to register a new admin (unauthorized operation)
  // This should be blocked with 403 Forbidden
  const newAdminEmail = typia.random<string & tags.Format<"email">>();
  const newAdminPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "regular administrator cannot register new admin",
    async () => {
      await api.functional.shoppingMall.auth.admin.join(
        regularAdminConnection,
        {
          body: {
            email: newAdminEmail,
            password: newAdminPassword,
            href: "https://example.com/new-admin-join",
            referrer: "https://example.com",
          } satisfies IShoppingMallAdmin.IJoin,
        },
      );
    },
  );
}
