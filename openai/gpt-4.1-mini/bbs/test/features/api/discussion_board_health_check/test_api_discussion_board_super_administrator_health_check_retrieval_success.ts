import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_discussion_board_super_administrator_health_check_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdministrator account and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // Update connection with authorized token
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = `Bearer ${superAdmin.token.access}`;
  // 2. Generate a random health check ID
  const id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the health check record by the authorized superAdministrator
  const healthCheck =
    await api.functional.discussionBoard.superAdministrator.healthChecks.at(
      superAdminConnection,
      { id },
    );
  // 4. Assert the response type
  typia.assert(healthCheck);
  // 5. Validate presence and types of required fields
  TestValidator.predicate(
    "id exists and is valid UUID",
    typeof healthCheck.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(healthCheck.id),
  );
  TestValidator.predicate(
    "status exists and is string",
    typeof healthCheck.status === "string",
  );
  TestValidator.predicate(
    "checkedAt exists and is ISO date-time string",
    typeof healthCheck.checkedAt === "string",
  );
  TestValidator.predicate(
    "createdAt exists and is ISO date-time string",
    typeof healthCheck.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt exists and is ISO date-time string",
    typeof healthCheck.updatedAt === "string",
  );
  // 6. details and deletedAt can be null or string
  TestValidator.predicate(
    "details nullable or string",
    healthCheck.details === null ||
      healthCheck.details === undefined ||
      typeof healthCheck.details === "string",
  );
  TestValidator.predicate(
    "deletedAt nullable or string",
    healthCheck.deletedAt === null ||
      healthCheck.deletedAt === undefined ||
      typeof healthCheck.deletedAt === "string",
  );
}
