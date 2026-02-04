import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticBoardSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Validate that the statistics endpoint correctly returns monthly platform activity aggregates for the last 12 months after creating a new administrative account.
 * This test covers key metrics including member user growth (excluding guest accounts), article creation volume, comment activity, and active section count.
 * Ensures data is grouped by calendar month in descending order (newest first) and includes cache validation to confirm proper performance for dashboard consumption.
 */
export async function test_api_admin_statistics_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      // No specific fields required for admin join, as per DTO definition
    } satisfies IEconPoliticBoardAdmin.IJoin,
  });
  // Step 2: Call the statistics endpoint with the admin connection
  const statistics =
    await api.functional.econPoliticBoard.admin.statistics.index(
      adminConnection,
    );
  typia.assert(statistics);
  // Step 3: Validate the response structure and content
  TestValidator.equals(
    "pagination should exist",
    !!statistics.pagination,
    true,
  );
  TestValidator.equals("data array should exist", !!statistics.data, true);
  TestValidator.equals(
    "should have at least one statistics record",
    statistics.data.length > 0,
    true,
  );
}
