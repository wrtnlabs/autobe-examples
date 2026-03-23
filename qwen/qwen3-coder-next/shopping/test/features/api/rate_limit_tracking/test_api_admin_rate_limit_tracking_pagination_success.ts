import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRateLimitTracking";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRateLimitTracking";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_rate_limit_tracking_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Create new connection with admin token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // Step 3: Retrieve paginated rate limit tracking records
  const response =
    await api.functional.ecommerceMall.admin.rate_limit_trackings.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRateLimitTracking.IRequest,
      },
    );
  typia.assert(response);
  // Step 4: Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  // Step 5: Verify pagination fields
  TestValidator.predicate(
    "current page >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  TestValidator.equals("limit matches request", response.pagination.limit, 10);
  // Step 6: Confirm data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Step 7: Validate rate limit tracking records structure
  if (response.data.length > 0) {
    const firstRecord = response.data[0];
    typia.assert<IEcommerceMallRateLimitTracking.ISummary>(firstRecord);
    TestValidator.predicate("has id", firstRecord.id !== undefined);
    TestValidator.predicate("has ip", firstRecord.ip !== undefined);
    TestValidator.predicate(
      "has request_count",
      firstRecord.request_count !== undefined,
    );
    TestValidator.predicate(
      "has window_start",
      firstRecord.window_start !== undefined,
    );
    TestValidator.predicate(
      "has window_end",
      firstRecord.window_end !== undefined,
    );
    TestValidator.predicate("has blocked", firstRecord.blocked !== undefined);
  }
}
