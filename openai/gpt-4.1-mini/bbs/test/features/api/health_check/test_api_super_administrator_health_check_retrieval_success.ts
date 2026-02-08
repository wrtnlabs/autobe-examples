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

export async function test_api_super_administrator_health_check_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator joins (registers) and gets authorization token
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPayload: IDiscussionBoardSuperAdministrator.IJoin = {};
  const auth: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(joinConnection, {
      body: joinPayload,
    });
  // Set authorization header for actor-specific connection
  const actorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${auth.token.access}` },
  };
  // Generate a random UUID for health check id to retrieve
  const healthCheckId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Call GET /discussionBoard/superAdministrator/healthChecks/{id} endpoint
  const healthCheck: IDiscussionBoardHealthCheck =
    await api.functional.discussionBoard.superAdministrator.healthChecks.at(
      actorConnection,
      { id: healthCheckId },
    );
  // 3. Validate the response DTO
  typia.assert(healthCheck);
}
