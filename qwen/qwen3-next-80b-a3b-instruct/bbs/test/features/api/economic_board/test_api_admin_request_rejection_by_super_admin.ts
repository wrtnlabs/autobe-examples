import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import type { IEconomicBoardSystemOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemOverview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_admin_request_rejection_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate superAdministrator using utility function
  const superAdminConn: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(superAdminConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // 2. Call reject endpoint with a randomly generated valid UUID as requestId
  // Since no API exists to create a pending admin request, we generate a random UUID
  // The system should validate authentication and respond successfully if the UUID is valid
  // This tests the rejection pathway with proper authentication
  const result: IEconomicBoardSystemOverview =
    await api.functional.economicBoard.superAdministrator.admin.admin_requests.reject(
      superAdminConn,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(result);
  // 3. Validate the response structure
  TestValidator.equals("system status", result.status, "online");
  TestValidator.predicate(
    "version is a string",
    typeof result.version === "string",
  );
  TestValidator.predicate(
    "links is an object",
    typeof result.links === "object" && result.links !== null,
  );
}
