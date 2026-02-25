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

export async function test_api_health_check_update_by_administrator_valid_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins to the system
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Create initial health check record as administrator
  const initialHealthCheck =
    await generate_random_discussion_board_administrator_health_checks_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(initialHealthCheck);
  // 3. Prepare update data for the health check
  const updatedBody: IDiscussionBoardHealthCheck.IUpdate = {
    status: RandomGenerator.pick(["OK", "WARNING", "ERROR"]),
    checkedAt: new Date().toISOString(),
    details: RandomGenerator.paragraph({ sentences: 3 }),
    updatedAt: new Date().toISOString(),
  };
  // 4. Execute update health check
  const updatedHealthCheck =
    await api.functional.discussionBoard.administrator.healthChecks.updateHealthCheck(
      adminConnection,
      {
        id: initialHealthCheck.id,
        body: updatedBody,
      },
    );
  typia.assert(updatedHealthCheck);
  // 5. Validate updated properties
  TestValidator.equals(
    "health check id matches",
    updatedHealthCheck.id,
    initialHealthCheck.id,
  );
  TestValidator.equals(
    "status updated",
    updatedHealthCheck.status,
    updatedBody.status,
  );
  TestValidator.equals(
    "checkedAt updated",
    updatedHealthCheck.checkedAt,
    updatedBody.checkedAt,
  );
  TestValidator.equals(
    "details updated",
    updatedHealthCheck.details ?? null,
    updatedBody.details ?? null,
  );
  // updatedAt in response should be equal or later than the updatedAt sent
  TestValidator.predicate(
    "updatedAt is same or later",
    new Date(updatedHealthCheck.updatedAt).getTime() >=
      new Date(updatedBody.updatedAt ?? updatedHealthCheck.updatedAt).getTime(),
  );
}
