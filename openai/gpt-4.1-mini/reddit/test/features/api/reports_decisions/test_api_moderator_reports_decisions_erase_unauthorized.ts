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

export async function test_api_moderator_reports_decisions_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test that deletion of a moderator report decision is forbidden for unauthorized users.
  // The scenario attempts to delete a report decision without moderator authentication.
  // It verifies that the system returns an access denied or unauthorized error,
  // ensuring authorization is enforced consistently.
  // Create a new connection without authorization (unauthorized user)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for reportDecisionId
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the report decision without authorization and ensure it throws HTTP 401 or 403 error
  await TestValidator.httpError(
    "unauthorized deletion of report decision should be forbidden",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.reportsDecisions.erase(
        unauthorizedConnection,
        { reportDecisionId },
      );
    },
  );
}
