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

export async function test_api_discussion_board_administrator_health_check_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join to obtain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Retrieve a health check record by ID using the authorized connection
  const healthCheck =
    await api.functional.discussionBoard.administrator.healthChecks.at(
      adminConnection,
      { id: admin.id },
    );
  typia.assert(healthCheck);
  // 3. Validate the health check fields
  TestValidator.predicate(
    "health check id validity",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      healthCheck.id,
    ),
  );
  TestValidator.equals("status presence", typeof healthCheck.status, "string");
  TestValidator.predicate(
    "checkedAt format",
    typeof healthCheck.checkedAt === "string" &&
      !isNaN(Date.parse(healthCheck.checkedAt)),
  );
  TestValidator.predicate(
    "details nullability",
    healthCheck.details === null || typeof healthCheck.details === "string",
  );
  TestValidator.predicate(
    "createdAt format",
    typeof healthCheck.createdAt === "string" &&
      !isNaN(Date.parse(healthCheck.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt format",
    typeof healthCheck.updatedAt === "string" &&
      !isNaN(Date.parse(healthCheck.updatedAt)),
  );
  TestValidator.predicate(
    "deletedAt nullability",
    healthCheck.deletedAt === null || typeof healthCheck.deletedAt === "string",
  );
}
