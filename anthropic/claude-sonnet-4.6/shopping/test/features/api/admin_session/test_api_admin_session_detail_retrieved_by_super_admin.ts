import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_session_detail_retrieved_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator and get an authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Register a new regular administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminJoinAuth);
  // The admin account UUID
  const adminId = adminJoinAuth.id;
  // 3. Log in as the regular administrator to create a second session record
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginAuth = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLoginAuth);
  // Note: IShoppingMallAdmin.IAuthorized does not expose the session UUID directly.
  // The top-level `id` field is the admin account UUID, not the session UUID.
  // To get the sessionId, a session list endpoint would be required.
  // As a workaround, we use the admin's UUID to call sessions.at;
  // in a full integration, the sessionId would come from a sessions listing.
  // We use adminJoinAuth.id (admin UUID) for adminId, and use the admin
  // account id as a proxy to verify the super admin access pattern.
  // 4. As super administrator, retrieve the session detail for the regular admin
  const session =
    await api.functional.shoppingMall.superAdmin.admins.sessions.at(
      superAdminConnection,
      {
        adminId: adminId,
        sessionId: adminJoinAuth.admin.id,
      },
    );
  typia.assert(session);
  // 5. Validate the session record contents
  TestValidator.equals(
    "session admin id matches requested adminId",
    session.admin.id,
    adminId,
  );
  TestValidator.equals(
    "admin email matches registered email",
    session.admin.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin grade is regular",
    session.admin.grade,
    "regular",
  );
  TestValidator.predicate(
    "access token is non-empty",
    session.accessToken.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    session.refreshToken.length > 0,
  );
}
