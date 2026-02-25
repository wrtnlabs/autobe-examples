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

export async function test_api_owner_analytics_statistics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new owner account
  const joinConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: typia.random<string & tags.Format<"email">>().split("@")[0],
    displayName: "Test Owner",
  } satisfies IRedditCloneOwner.IJoin;
  const authorizedOwner = await authorize_owner_join(joinConnection, {
    body: ownerData,
  });
  typia.assert(authorizedOwner);
  // 2. Create authenticated connection for the owner
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: authorizedOwner.token.access,
    },
  };
  // 3. Call the analytics statistics endpoint
  const response =
    await api.functional.redditClone.owner.analytics.statistics.index(
      ownerConnection,
      {
        body: {},
      },
    );
  // 4. Validate response structure and content
  typia.assert(response);
  typia.assert<IRedditCloneFeedConfig.ISummary[]>(response.data);
  // 5. Verify essential metrics are present and valid
  const stats = response.data[0];
  // User metrics
  TestValidator.predicate("has total users", stats.users.total > 0);
  TestValidator.predicate("has active users", stats.users.active_24h >= 0);
  // Content metrics
  TestValidator.predicate("has content metrics", stats.content.posts >= 0);
  TestValidator.predicate("has votes", stats.content.votes >= 0);
  // Community metrics
  TestValidator.predicate("has communities", stats.communities.total >= 0);
  TestValidator.predicate(
    "has subscribers",
    stats.communities.subscribers_total >= 0,
  );
  // Moderation metrics
  TestValidator.predicate(
    "has moderation data",
    stats.moderation.reports_total >= 0,
  );
  TestValidator.predicate("has bans", stats.moderation.bans_total >= 0);
  // Karma metrics
  TestValidator.predicate("has karma stats", stats.karma.average >= 0);
  TestValidator.predicate(
    "has users with karma",
    stats.karma.users_with_karma >= 0,
  );
  // Timestamp validation
  TestValidator.predicate(
    "has generated timestamp",
    new Date(stats.generated_at) <= new Date(),
  );
}
