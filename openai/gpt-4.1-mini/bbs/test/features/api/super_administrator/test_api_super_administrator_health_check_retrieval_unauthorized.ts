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

export async function test_api_super_administrator_health_check_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // We do not authorize as super administrator.
  // We use the base connection without any authorization headers.
  // Attempt to retrieve a health check with a random UUID (as ID).
  // Expect the operation to fail with 403 Forbidden error.
  await TestValidator.httpError(
    "unauthorized access to health check",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.healthChecks.at(
        connection,
        { id: typia.random<string & typia.tags.Format<"uuid">>() },
      );
    },
  );
}
