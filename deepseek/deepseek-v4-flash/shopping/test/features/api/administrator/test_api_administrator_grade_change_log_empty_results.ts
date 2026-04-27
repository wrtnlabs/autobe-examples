import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminGradeChangeLog";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdminGradeChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdminGradeChangeLog";
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

/**
 * Test that querying grade change logs for an administrator with no change history returns an empty result.
 *
 * Validates that the grade change log endpoint correctly handles the edge case where the target administrator has never been promoted or demoted. The response must return a well-formed paginated result with zero records, zero pages, and current page set to 1, rather than an error or null response.
 *
 * The test establishes a super administrator actor through promotion to ensure proper authorization for querying another administrator's grade change history.
 *
 * 1. Register regular administrator A and capture their UUID.
 * 2. Promote administrator A to super administrator using A's UUID.
 * 3. Register regular administrator C (no grade changes ever).
 * 4. Query grade change logs for administrator C using default pagination.
 * 5. Verify pagination metadata reflects empty results: current = 1, records = 0, pages = 0, limit is positive, data array is empty.
 */
export async function test_api_administrator_grade_change_log_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register regular administrator A (will be promoted to super admin)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA: IECommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminAConnection, {
      body: typia.random<IECommerceMallAdministrator.IJoin>(),
    });
  typia.assert(adminA);
  // Step 2: Promote admin A to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminA: IECommerceMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        administrator_id: adminA.id,
      },
    });
  typia.assert(superAdminA);
  // Step 3: Register regular administrator C (never promoted or demoted)
  const adminCConnection: api.IConnection = { host: connection.host };
  const adminC: IECommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminCConnection, {
      body: typia.random<IECommerceMallAdministrator.IJoin>(),
    });
  typia.assert(adminC);
  // Step 4: Query grade change logs for admin C as super admin A
  const result: IPageIECommerceMallAdminGradeChangeLog.ISummary =
    await api.functional.eCommerceMall.superAdministrator.administrators.grade_change_logs.index(
      superAdminConnection,
      {
        administratorId: adminC.id,
        body: {} satisfies IECommerceMallAdminGradeChangeLog.IRequest,
      },
    );
  typia.assert(result);
  // Step 5: Validate empty result pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("total records", result.pagination.records, 0);
  TestValidator.equals("total pages", result.pagination.pages, 0);
  TestValidator.predicate("limit is present", result.pagination.limit > 0);
  TestValidator.equals("data array is empty", result.data.length, 0);
}
