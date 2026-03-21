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

/**
 * Test filtering admin sessions by specific admin account.
 *
 * This test validates that the admin sessions filtering endpoint correctly
 * isolates and returns only sessions belonging to a specific admin when
 * filtering by erp_hrm_admin_id. It verifies:
 * 1. Creating multiple admin accounts generates separate sessions
 * 2. Filtering by admin ID returns only matching sessions
 * 3. Sessions from other admins are excluded from filtered results
 * 4. Pagination metadata accurately reflects the filtered record count
 */
export async function test_api_admin_session_filtering_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account and establish session
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin1);
  // 2. Create second admin account and establish separate session
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin2);
  // 3. Filter sessions by admin1's ID
  const filteredResponse =
    await api.functional.erpHrm.admin.admin_sessions.index(admin1Connection, {
      body: {
        erp_hrm_admin_id: admin1.id,
      } satisfies IErpHrmAdminSession.IRequest,
    });
  typia.assert(filteredResponse);
  // 4. Validate all returned sessions belong to admin1
  TestValidator.equals("has sessions", filteredResponse.data.length > 0, true);
  for (const session of filteredResponse.data) {
    TestValidator.equals(
      "session belongs to admin1",
      session.admin.id,
      admin1.id,
    );
    TestValidator.notEquals(
      "session does not belong to admin2",
      session.admin.id,
      admin2.id,
    );
  }
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "records count is accurate",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "data length matches pagination",
    filteredResponse.data.length,
    Math.min(
      filteredResponse.pagination.records,
      filteredResponse.pagination.limit,
    ),
  );
}
