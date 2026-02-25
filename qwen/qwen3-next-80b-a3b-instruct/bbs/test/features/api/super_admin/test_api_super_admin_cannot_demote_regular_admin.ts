import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_admin_cannot_demote_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminRaw = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      } satisfies IEconomicBoardSuperAdministrator.IJoin,
    },
  );
  const superAdmin = typia.assert(superAdminRaw);
  // 2. Create regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminRaw = await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  const admin = typia.assert(adminRaw);
  // 3. Authenticate as super administrator using original credentials
  const demoterConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(demoterConnection, {
    body: {
      email: superAdminEmail, // Use original email from join, not from response
      password: superAdminPassword, // Use original password from join
    } satisfies IEconomicBoardSuperAdministrator.ILogin,
  });
  // 4. Attempt to demote regular administrator (this should fail with 403)
  let caughtError: any;
  try {
    await api.functional.economicBoard.superAdministrator.users.demote(
      demoterConnection,
      {
        id: admin.id,
      },
    );
  } catch (err) {
    caughtError = err;
  }
  if (!caughtError) {
    throw new Error("Expected HTTP error but none was thrown");
  }
  // Verify it's an HttpError with 403 status
  TestValidator.equals("status code is 403", caughtError.status, 403);
  // Verify the error code in the response body
  const errorJson = caughtError.toJSON();
  void TestValidator.predicate(
    "error message contains ECONOMICBOARD_CANNOT_DEMOTE_TO_LOWER_LEVEL",
    () =>
      typeof errorJson.message === "string" &&
      errorJson.message.includes("ECONOMICBOARD_CANNOT_DEMOTE_TO_LOWER_LEVEL"),
  );
  // 5. Verify the regular administrator still exists as administrator (no demotion occurred)
  const reauthConnection: api.IConnection = { host: connection.host };
  const adminStillExists = await authorize_administrator_login(
    reauthConnection,
    {
      body: {
        email: adminEmail, // Use original email from join
        password: adminPassword, // Use original password from join
      } satisfies IEconomicBoardAdministrator.ILogin,
    },
  );
  typia.assert(adminStillExists);
  TestValidator.equals(
    "user is still administrator",
    adminStillExists.role,
    "administrator",
  );
}
