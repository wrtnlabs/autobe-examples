import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_health_check_list_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator join and permission setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & typia.tags.Format<"uri">>(),
        referrer: typia.random<string & typia.tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = superAdmin.token.access;
  // 2. Prepare filter: status 'OK', checkedAfter and checkedBefore
  const now = new Date();
  const checkedAfter = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const checkedBefore = now.toISOString();
  const limit = 10 satisfies number &
    typia.tags.Type<"int32"> &
    typia.tags.Minimum<1> &
    typia.tags.Maximum<100>;
  const page = 1 satisfies number &
    typia.tags.Type<"int32"> &
    typia.tags.Minimum<1>;
  const requestBody: IDiscussionBoardHealthCheck.IRequest = {
    status: "OK",
    checkedAfter: checkedAfter,
    checkedBefore: checkedBefore,
    page: page,
    limit: limit,
  };
  // 3. Retrieve health checks with filters and pagination
  const healthCheckPage: IPageIDiscussionBoardHealthCheck.ISummary =
    await api.functional.discussionBoard.superAdministrator.healthChecks.index(
      superAdminConnection,
      { body: requestBody },
    );
  typia.assert(healthCheckPage);
  // 4. Validate pagination metadata
  const pagination = healthCheckPage.pagination;
  TestValidator.predicate(
    "pagination current page is >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is in range",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  if (pagination.records === 0) {
    TestValidator.equals(
      "pagination pages is 0 when no records",
      pagination.pages,
      0,
    );
    TestValidator.equals(
      "pagination data is empty array",
      healthCheckPage.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "pagination pages matches records and limit",
      pagination.pages >= 1,
    );
    TestValidator.predicate(
      "data length <= pagination limit",
      healthCheckPage.data.length <= pagination.limit,
    );
  }
  // 5. Validate each data item
  for (const item of healthCheckPage.data) {
    typia.assert(item);
    TestValidator.equals("item status is 'OK'", item.status, "OK");
    TestValidator.predicate(
      "item checkedAt is within filter range",
      item.checkedAt >= checkedAfter && item.checkedAt <= checkedBefore,
    );
    TestValidator.predicate(
      "item id is uuid format",
      /^[0-9a-fA-F-]{36}$/.test(item.id),
    );
    TestValidator.predicate(
      "item createdAt is date-time",
      !isNaN(Date.parse(item.createdAt)),
    );
    // details can be null or string
  }
  // 6. Authorization enforcement: try access without token or with invalid token
  const unauthorizedConn: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should reject without authorization",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.healthChecks.index(
        unauthorizedConn,
        { body: requestBody },
      );
    },
  );
  const invalidTokenConn: api.IConnection = { host: connection.host };
  invalidTokenConn.headers = { Authorization: "Bearer invalidtoken" };
  await TestValidator.httpError(
    "should reject with invalid authorization token",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.healthChecks.index(
        invalidTokenConn,
        { body: requestBody },
      );
    },
  );
}
