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

export async function test_api_administrator_health_check_create_unauthorized_prevention(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests that unauthorized users cannot create health check records in the system.
  // It tries to create health checks without authentication, expecting 401 or 403 errors.
  // 1. Attempt health check creation without authentication
  await TestValidator.httpError(
    "unauthorized create without login",
    [401, 403],
    async () => {
      const body = {
        status: "OK",
        checkedAt: new Date().toISOString(),
        details: "Attempt without authentication",
      } satisfies IDiscussionBoardHealthCheck.ICreate;
      await generate_random_discussion_board_administrator_health_checks_create(
        connection,
        {
          body,
        },
      );
    },
  );
  // 2. Attempt health check creation after administrator join but using base connection (no auth token)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  // Intentionally use the base connection (no token header) to call create - should fail
  await TestValidator.httpError(
    "unauthorized create after join but no auth token",
    [401, 403],
    async () => {
      const body = {
        status: "OK",
        checkedAt: new Date().toISOString(),
        details: "Attempt with join but no auth token",
      } satisfies IDiscussionBoardHealthCheck.ICreate;
      await generate_random_discussion_board_administrator_health_checks_create(
        connection,
        {
          body,
        },
      );
    },
  );
  // 3. Attempt health check creation with invalid token (fake token)
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalidtoken" },
  };
  await TestValidator.httpError(
    "unauthorized create with invalid token",
    [401, 403],
    async () => {
      const body = {
        status: "OK",
        checkedAt: new Date().toISOString(),
        details: "Attempt with invalid token",
      } satisfies IDiscussionBoardHealthCheck.ICreate;
      await generate_random_discussion_board_administrator_health_checks_create(
        invalidTokenConnection,
        {
          body,
        },
      );
    },
  );
}
