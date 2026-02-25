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
import { generate_random_discussion_board_super_administrator_health_checks_create } from "../../../generate/generate_random_discussion_board_super_administrator_health_checks_create";
import { prepare_random_discussion_board_health_check } from "../../../prepare/prepare_random_discussion_board_health_check";

export async function test_api_health_check_creation_with_optional_details(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a super administrator and obtain authorized connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuthorized.token.access}`,
  };
  // Create a health check record with optional details field provided
  const optionalDetails = `Details: ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const createBody: IDiscussionBoardHealthCheck.ICreate = {
    status: "OK",
    checkedAt: new Date().toISOString(),
    details: optionalDetails,
  };
  const healthCheck =
    await generate_random_discussion_board_super_administrator_health_checks_create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(healthCheck);
  // Validate all required properties are returned and correct
  TestValidator.equals("status matches", healthCheck.status, createBody.status);
  TestValidator.equals(
    "checkedAt matches",
    healthCheck.checkedAt,
    createBody.checkedAt,
  );
  TestValidator.equals(
    "details matches optional field",
    healthCheck.details,
    optionalDetails,
  );
  // Validate timestamps are proper ISO format
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.\d+)?Z$/.test(
      healthCheck.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.\d+)?Z$/.test(
      healthCheck.updatedAt,
    ),
  );
  // The deletedAt can be null or undefined, test explicitly
  TestValidator.predicate(
    "deletedAt is null or string",
    healthCheck.deletedAt === null || typeof healthCheck.deletedAt === "string",
  );
}
