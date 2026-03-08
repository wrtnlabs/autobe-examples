import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_demote_regular_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular administrator account with isolated connection
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: `${RandomGenerator.name()}@test.com` satisfies string &
        tags.Format<"email">,
      password: "RegularAdmin123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/join",
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(regularAdminAuth);
  // 2. Create super administrator account with isolated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: `${RandomGenerator.name()}@test.com` satisfies string &
        tags.Format<"email">,
      password: "SuperAdmin123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/join",
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // 3. Authenticate regular admin with their own connection
  // (headers already updated by authorize_admin_join call above)
  // 4. Attempt to demote super admin using regular admin connection
  // This should fail with 403 Forbidden - regular admin lacks permission
  await TestValidator.httpError(
    "regular admin cannot demote super admin",
    403,
    async () => {
      await api.functional.economicPoliticalBoard.admin.administrators.demote(
        regularAdminConnection,
        {
          adminId: superAdminAuth.id,
        },
      );
    },
  );
  // 5. Verify the error response contains permission-related message
  let errorMessage = "";
  try {
    await api.functional.economicPoliticalBoard.admin.administrators.demote(
      regularAdminConnection,
      {
        adminId: superAdminAuth.id,
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      errorMessage = error.toJSON().message as string;
    }
  }
  TestValidator.predicate(
    "error message indicates insufficient privileges",
    errorMessage.includes("Insufficient privileges") ||
      errorMessage.includes("super administrator") ||
      errorMessage.includes("demote"),
  );
}
