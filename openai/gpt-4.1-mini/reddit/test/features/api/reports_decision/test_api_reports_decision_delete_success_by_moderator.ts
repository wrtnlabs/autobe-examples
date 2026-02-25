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

export async function test_api_reports_decision_delete_success_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registers and logs in
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Create a unique email and username for moderator join
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email,
      username,
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  // Set Authorization header for subsequent requests
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Setup to create a report decision
  // Note: No creation API for report decision is given, so we rely on a pre-existing ID
  // Use a dummy UUID for deletion; In real scenario, this should be an existing report decision ID
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform delete operation
  await api.functional.communityPlatform.moderator.reports_decisions.erase(
    moderatorConnection,
    {
      id: reportDecisionId,
    },
  );
  // 4. No response content for delete, so cannot assert response body
  // 5. Optionally, test error on trying to delete again (not found)
  await TestValidator.httpError(
    "delete non-existent report decision fails",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.erase(
        moderatorConnection,
        {
          id: reportDecisionId,
        },
      );
    },
  );
}
