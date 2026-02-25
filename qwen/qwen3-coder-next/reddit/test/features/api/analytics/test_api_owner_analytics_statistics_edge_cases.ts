import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFeedConfig";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_analytics_statistics_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(10),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Test global analytics statistics (no community filter) for zero-content edge case
  const stats =
    await api.functional.redditClone.owner.analytics.statistics.index(
      ownerConnection,
      {
        body: {
          // Empty request for global statistics
        } satisfies IRedditCloneFeedConfig.IRequest,
      },
    );
  typia.assert(stats);
  // 3. Validate statistics structure is returned
  TestValidator.equals("stats data structure", stats.data.length, 1);
  const stat = stats.data[0];
  // 4. Validate all metrics exist with zero or valid values
  TestValidator.predicate(
    "users.total is non-negative integer",
    stat.users.total >= 0,
  );
  TestValidator.predicate(
    "content.posts is non-negative integer",
    stat.content.posts >= 0,
  );
  TestValidator.predicate(
    "content.comments is non-negative integer",
    stat.content.comments >= 0,
  );
  TestValidator.predicate(
    "content.votes is non-negative integer",
    stat.content.votes >= 0,
  );
  TestValidator.predicate(
    "communities.total is non-negative integer",
    stat.communities.total >= 0,
  );
  // 5. Verify timestamp is generated
  const isValidTimestamp = (dateStr: string): boolean => {
    try {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  };
  TestValidator.equals("generated_at timestamp valid", isValidTimestamp(stat.generated_at), true);
}