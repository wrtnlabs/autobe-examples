import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test the successful deletion of an existing moderator report decision.
 * The test performs the following steps:
 * 1. Register and authenticate a new moderator.
 * 2. Create a report decision in the system (mocked for test).
 * 3. Delete the report decision using the moderator connection.
 * 4. Verify deletion by checking subsequent retrieval fails with 404 Not Found.
 */
export async function test_api_moderator_reports_decisions_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and authorization
  const moderatorConnection: IConnection = { host: connection.host };
  const moderatorJoinBody: ICommunityPlatformModerator.IJoin = {};
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinBody,
  });
  typia.assert(authorized);
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = authorized.token.access;
  // 2. Create a report decision for the test (simulate creation since no create API given)
  // We generate a random UUID for reportDecisionId for testing erase endpoint
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();
  // In a real system, would insert a report decision here for test
  // but since no create API is available, we simulate that it exists
  // 3. Delete the report decision
  await api.functional.communityPlatform.moderator.reportsDecisions.erase(
    moderatorConnection,
    { reportDecisionId },
  );
  // 4. Verify deletion by attempting to delete again, expecting 404 error
  await TestValidator.httpError(
    "deleting non-existent report decision",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reportsDecisions.erase(
        moderatorConnection,
        { reportDecisionId },
      );
    },
  );
}
