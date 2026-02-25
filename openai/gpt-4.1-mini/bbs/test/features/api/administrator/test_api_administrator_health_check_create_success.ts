import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_health_checks_create } from "../../../generate/generate_random_discussion_board_administrator_health_checks_create";
import { prepare_random_discussion_board_health_check } from "../../../prepare/prepare_random_discussion_board_health_check";

export async function test_api_administrator_health_check_create_success(
  connection: api.IConnection,
): Promise<void> {
  // This test validates that an administrator can successfully create a system health check record.
  // 1. Administrator joins to get authenticated connection
  // 2. Generate and submit valid health check data
  // 3. Assert that the response structure is valid and fields are correctly reflected
  // 1. Administrator joining for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Use token returned to create authenticated connection
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // 2. Generate random health check create input
  const healthCheckInput: IDiscussionBoardHealthCheck.ICreate = {
    status: "OK",
    checkedAt: new Date().toISOString(),
    details: "System is operating normally.",
  };
  // 3. Call the generate random utility to create health check record
  const healthCheck =
    await generate_random_discussion_board_administrator_health_checks_create(
      authenticatedConnection,
      { body: healthCheckInput },
    );
  typia.assert(healthCheck);
  // 4. Validate returned data
  TestValidator.equals(
    "status field matches",
    healthCheck.status,
    healthCheckInput.status,
  );
  TestValidator.equals(
    "checkedAt field matches",
    healthCheck.checkedAt,
    healthCheckInput.checkedAt,
  );
  TestValidator.equals(
    "details field matches",
    healthCheck.details ?? null,
    healthCheckInput.details,
  );
  TestValidator.predicate(
    "id is a valid UUID",
    typeof healthCheck.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(healthCheck.id),
  );
  TestValidator.predicate(
    "createdAt is a valid ISO date-time string",
    typeof healthCheck.createdAt === "string" &&
      !isNaN(Date.parse(healthCheck.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is a valid ISO date-time string",
    typeof healthCheck.updatedAt === "string" &&
      !isNaN(Date.parse(healthCheck.updatedAt)),
  );
  TestValidator.predicate(
    "deletedAt is null or a valid ISO date-time string",
    healthCheck.deletedAt === null ||
      (typeof healthCheck.deletedAt === "string" &&
        !isNaN(Date.parse(healthCheck.deletedAt))),
  );
}
