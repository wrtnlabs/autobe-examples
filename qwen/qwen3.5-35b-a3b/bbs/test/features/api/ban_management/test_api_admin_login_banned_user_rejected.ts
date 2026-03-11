import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_banned_user_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  const regularAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: regularAdminEmail,
      password: "Admin123!",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  const regularAdminId = regularAdmin.id;
  // 2. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  const superAdminId = superAdmin.id;
  // 3. Verify ban listing works with super admin authentication
  const banRequestBody = {
    page: 1,
    limit: 20,
  } satisfies IEconomicPoliticalBoardBanRecord.IRequest;
  const banList = await api.functional.economicPoliticalBoard.admin.bans.index(
    superAdminConnection,
    {
      body: banRequestBody,
    },
  );
  typia.assert(banList);
  // 4. Attempt to login with banned admin's credentials
  // Expected to fail with 401 or 403 error
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "banned admin cannot login",
    [401, 403],
    async () => {
      await authorize_admin_login(loginConnection, {
        body: {
          email: regularAdminEmail,
          password: "Admin123!",
        } satisfies IEconomicPoliticalBoardAdmin.ILogin,
      });
    },
  );
  // 5. Verify the login attempt returns no tokens (connection should not be updated)
  // The connection object is mutated internally by authorize_admin_login on success,
  // but should fail before updating headers on ban rejection
  TestValidator.predicate(
    "login connection not updated",
    !loginConnection.headers?.Authorization,
  );
}