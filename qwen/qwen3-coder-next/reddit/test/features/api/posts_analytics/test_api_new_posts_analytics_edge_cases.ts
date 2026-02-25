import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_new_posts_analytics_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: null,
    } satisfies IRedditCloneGuest.IJoin,
  });
  const analytics: IRedditCloneContentPost.INewPost =
    await api.functional.redditClone.guest.analytics.posts._new.newPostsAnalytics(
      guestConnection,
    );
  typia.assert(analytics);
  TestValidator.equals("type discriminator", analytics.type, "new");
  // Validate time period structure
  TestValidator.equals(
    "period start_date exists",
    Boolean(analytics.period.start_date),
    true,
  );
  TestValidator.equals(
    "period end_date exists",
    Boolean(analytics.period.end_date),
    true,
  );
  // Validate analytics counts are non-negative
  TestValidator.predicate(
    "total posts non-negative",
    analytics.totalPosts >= 0,
  );
  TestValidator.predicate(
    "creation rate non-negative",
    analytics.creationRate.absolute_growth >= 0,
  );
  // Validate empty/edge case handling
  TestValidator.predicate(
    "posts by community exists",
    Array.isArray(analytics.postsByCommunity),
  );
  TestValidator.predicate(
    "creation rate exists",
    analytics.creationRate !== undefined,
  );
  TestValidator.predicate("trends exists", analytics.trends !== undefined);
}
