import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_superadministrator_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create new super administrator account using join endpoint (as specified in dependency)
  const joinResponse =
    await api.functional.economicBoard.auth.superAdministrator.join(
      superAdminConnection,
      {
        body: typia.random<IEconomicBoardSuperAdministrator.IJoin>(),
      },
    );
  typia.assert(joinResponse);
  // Update the superAdminConnection with the access token from join response
  // Note: The join implementation automatically updates connection headers with authorization token
  // Retrieve system metrics
  const metrics =
    await api.functional.economicBoard.superAdministrator.metrics.index(
      superAdminConnection,
    );
  typia.assert(metrics);
  // Validate that the response is of type IEconomicBoardProfile
  // Since IEconomicBoardProfile is empty, we cannot validate specific properties
  // The typia.assert ensures the response structure matches the expected type
  // This validates that the endpoint returns a valid IEconomicBoardProfile object
}
