import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_moderator_dashboard_empty_state_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create owner connection for authorization
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
      displayName: `Owner ${RandomGenerator.name()}`,
    } satisfies IRedditCloneOwner.IJoin,
  });
  // Fetch moderator analytics dashboard (empty state)
  const dashboard =
    await api.functional.redditClone.owner.analytics.moderator.dashboard.analytics(
      ownerConnection,
    );
  typia.assert(dashboard);
  // Validate empty state metrics are all zero
  TestValidator.equals(
    "daily active moderators zero",
    dashboard.dailyActiveModerators,
    0,
  );
  TestValidator.equals("posts moderated zero", dashboard.postsModerated, 0);
  TestValidator.equals(
    "comments moderated zero",
    dashboard.commentsModerated,
    0,
  );
  TestValidator.equals("bans issued zero", dashboard.bansIssued, 0);
  TestValidator.equals("bans lifted zero", dashboard.bansLifted, 0);
  TestValidator.equals("pending reports zero", dashboard.pendingReports, 0);
  TestValidator.equals("resolved reports zero", dashboard.resolvedReports, 0);
  TestValidator.equals("approval rate zero", dashboard.approvalRate, 0);
}
