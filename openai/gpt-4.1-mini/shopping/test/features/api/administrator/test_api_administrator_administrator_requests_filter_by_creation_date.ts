import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_requests_filter_by_creation_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator connection by registering a new admin and obtaining auth token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  // Apply the auth token to adminConnection headers
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Prepare date range for filtering
  const nowDate = new Date();
  const dateBefore = new Date(nowDate.getTime() - 1000 * 60 * 60 * 24 * 3); // 3 days ago
  const dateAfter = new Date(nowDate.getTime() - 1000 * 60 * 60 * 24 * 10); // 10 days ago
  const body: IShoppingMallAdministratorRequest.IRequest = {
    createdAfter: dateAfter.toISOString() as string & tags.Format<"date-time">,
    createdBefore: dateBefore.toISOString() as string &
      tags.Format<"date-time">,
    page: 1,
    limit: 10,
  };
  // 3. Call administratorRequests.index endpoint using adminConnection and filtering by date range
  const response =
    await api.functional.shoppingMall.administrator.administratorRequests.index(
      adminConnection,
      {
        body,
      },
    );
  // 4. Assert the response shape
  typia.assert(response);
  // 5. Validate pagination properties
  TestValidator.predicate(
    "page current number is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("page limit is 10", response.pagination.limit === 10);
  TestValidator.predicate(
    "page records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Validate each administrator request creation date within requested range
  for (const req of response.data) {
    typia.assert(req);
    const createdTime = new Date(req.createdAt).getTime();
    const afterTime = new Date(body.createdAfter!).getTime();
    const beforeTime = new Date(body.createdBefore!).getTime();
    TestValidator.predicate(
      `request createdAt after filter`,
      createdTime >= afterTime && createdTime <= beforeTime,
    );
    // Also basic properties
    TestValidator.predicate(
      `request id is UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        req.id,
      ),
    );
    TestValidator.predicate(
      `status is one of allowed values`,
      ["pending", "approved", "rejected"].includes(req.status),
    );
  }
  // 7. Verify administrator authorization required
  const baseConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized request should fail",
    401,
    async () =>
      await api.functional.shoppingMall.administrator.administratorRequests.index(
        baseConnection,
        { body },
      ),
  );
}
