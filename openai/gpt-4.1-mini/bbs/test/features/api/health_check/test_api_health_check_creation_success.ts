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

export async function test_api_health_check_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize a new superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // Update auth token in connection after join
  superAdminConnection.headers = {
    ...(superAdminConnection.headers ?? {}),
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Create a health check record with mandatory fields
  const minimalBody: IDiscussionBoardHealthCheck.ICreate = {
    status: "OK",
    checkedAt: new Date().toISOString(),
  };
  const healthCheckMinimal =
    await generate_random_discussion_board_super_administrator_health_checks_create(
      superAdminConnection,
      { body: minimalBody },
    );
  typia.assert(healthCheckMinimal);
  TestValidator.equals(
    "healthCheck status",
    healthCheckMinimal.status,
    minimalBody.status,
  );
  TestValidator.equals(
    "healthCheck checkedAt",
    healthCheckMinimal.checkedAt,
    minimalBody.checkedAt,
  );
  // 3. Create a health check record with all fields including optional details
  const detailedBody: IDiscussionBoardHealthCheck.ICreate = {
    status: "WARNING",
    checkedAt: new Date().toISOString(),
    details: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const healthCheckDetailed =
    await generate_random_discussion_board_super_administrator_health_checks_create(
      superAdminConnection,
      { body: detailedBody },
    );
  typia.assert(healthCheckDetailed);
  TestValidator.equals(
    "healthCheck status",
    healthCheckDetailed.status,
    detailedBody.status,
  );
  TestValidator.equals(
    "healthCheck checkedAt",
    healthCheckDetailed.checkedAt,
    detailedBody.checkedAt,
  );
  TestValidator.equals(
    "healthCheck details",
    healthCheckDetailed.details ?? null,
    detailedBody.details ?? null,
  );
  // 4. Negative test: Create health check without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized create health check", async () => {
    await generate_random_discussion_board_super_administrator_health_checks_create(
      unauthorizedConnection,
      { body: detailedBody },
    );
  });
}
