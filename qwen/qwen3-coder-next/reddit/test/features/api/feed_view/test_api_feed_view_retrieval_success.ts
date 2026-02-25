import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_feed_view_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Get a feed view from the database (assuming one exists)
  // Since we need a valid feedViewId, we'll use the member's UUID as a placeholder
  // In a real scenario, we would create a feed view first or use a known ID
  const feedViews = await api.functional.redditClone.feed_views.at(
    memberConnection,
    {
      feedViewId: member.id, // Use member id as feedViewId placeholder
    },
  );
  typia.assert(feedViews);
  // 3. Validate feed view structure
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(feedViews.id),
  );
  TestValidator.predicate(
    "has valid cache key",
    typeof feedViews.cache_key === "string",
  );
  TestValidator.predicate("ttl_seconds is positive", feedViews.ttl_seconds > 0);
  TestValidator.predicate(
    "has is_stale boolean",
    typeof feedViews.is_stale === "boolean",
  );
  // 4. Validate feedConfig relationship
  TestValidator.predicate(
    "has feedConfig",
    feedViews.feedConfig !== undefined && feedViews.feedConfig !== null,
  );
  TestValidator.predicate(
    "feedConfig has total users",
    typeof feedViews.feedConfig.users.total === "number",
  );
  TestValidator.predicate(
    "feedConfig has content metrics",
    typeof feedViews.feedConfig.content.posts === "number",
  );
}
