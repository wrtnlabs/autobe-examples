import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // Test 1: Filter sessions by valid date range (yesterday to tomorrow)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const validRangeResponse =
    await api.functional.erpHrm.admin.admin_sessions.index(adminConnection, {
      body: {
        created_at_from: yesterday.toISOString(),
        created_at_to: tomorrow.toISOString(),
      } satisfies IErpHrmAdminSession.IRequest,
    });
  typia.assert(validRangeResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination exists",
    validRangeResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(validRangeResponse.data),
  );
  // Validate all returned sessions have created_at within the specified date range
  for (const session of validRangeResponse.data) {
    const sessionCreatedAt = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at within range",
      sessionCreatedAt >= yesterday && sessionCreatedAt <= tomorrow,
    );
  }
  // Test 2: Edge case with impossible date range (year 2099 - no sessions should exist)
  const impossibleFrom = new Date("2099-01-01T00:00:00.000Z");
  const impossibleTo = new Date("2099-12-31T23:59:59.999Z");
  const noMatchResponse =
    await api.functional.erpHrm.admin.admin_sessions.index(adminConnection, {
      body: {
        created_at_from: impossibleFrom.toISOString(),
        created_at_to: impossibleTo.toISOString(),
      } satisfies IErpHrmAdminSession.IRequest,
    });
  typia.assert(noMatchResponse);
  // Verify empty data array when no sessions match
  TestValidator.equals(
    "no sessions in year 2099",
    noMatchResponse.data.length,
    0,
  );
  // Verify pagination shows records=0 when no results
  TestValidator.equals("records is 0", noMatchResponse.pagination.records, 0);
  TestValidator.equals("pages is 0", noMatchResponse.pagination.pages, 0);
}
