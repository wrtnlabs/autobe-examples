import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_health_check_retrieve_all(
  connection: api.IConnection,
): Promise<void> {
  // Prepare an administrator connection and authorize as administrator using join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePa55word!",
    },
  });
  typia.assert(adminAuthorized);
  // Use authorized adminConnection with token from adminAuthorized
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // Prepare empty filter request (no filters, test default pagination)
  const requestBody: IDiscussionBoardHealthCheck.IRequest = {};
  // Call the PATCH /discussionBoard/administrator/healthChecks endpoint
  const page: IPageIDiscussionBoardHealthCheck.ISummary =
    await api.functional.discussionBoard.administrator.healthChecks.index(
      adminConnection,
      { body: requestBody },
    );
  // Use typia.assert to validate response structure
  typia.assert(page);
  // Basic assertions
  TestValidator.predicate(
    "pagination current page is positive",
    () => page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => page.pagination.pages >= 0,
  );
  TestValidator.predicate("data array is defined", () =>
    Array.isArray(page.data),
  );
  // Check fields inside the data array for each health check summary
  for (const healthCheck of page.data) {
    typia.assert(healthCheck); // ensure correct type
    TestValidator.predicate(
      "health check has id",
      () => typeof healthCheck.id === "string" && healthCheck.id.length > 0,
    );
    TestValidator.predicate(
      "health check status is non empty",
      () =>
        typeof healthCheck.status === "string" && healthCheck.status.length > 0,
    );
    TestValidator.predicate(
      "health check checkedAt is ISO string",
      () =>
        typeof healthCheck.checkedAt === "string" &&
        !isNaN(Date.parse(healthCheck.checkedAt)),
    );
    TestValidator.predicate(
      "health check createdAt is ISO string",
      () =>
        typeof healthCheck.createdAt === "string" &&
        !isNaN(Date.parse(healthCheck.createdAt)),
    );
    // details can be null or string
    TestValidator.predicate(
      "health check details is string or null",
      () =>
        healthCheck.details === null || typeof healthCheck.details === "string",
    );
  }
}
