import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sessions_list_paged(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator session listing with pagination and summary fields.
   *
   * Verifies that an authenticated administrator can browse session records
   * using paging parameters and that the response contains read-only session
   * summaries with the expected owner and timestamp fields.
   *
   * 1. Register an administrator and create an authenticated administrator connection.
   * 2. Request a paged session list with a normal page, limit, and sort value.
   * 3. Validate pagination metadata and the readonly summary shape of each session.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234!Aa",
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 5,
    sort: "-createdAt",
  } satisfies IMallPlatformCustomerSession.IRequest;
  const output = await api.functional.mallPlatform.administrator.sessions.index(
    administratorConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page should match request",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "session list should not exceed requested limit",
    output.data.length <= request.limit,
  );
  TestValidator.predicate(
    "session summaries should contain read-only fields only",
    output.data.every((session) =>
      [
        session.id,
        session.customer.id,
        session.customer.email,
        session.ip,
        session.href,
        session.referrer,
        session.createdAt,
        session.expiredAt,
      ].every((value) => value.length > 0),
    ),
  );
}
