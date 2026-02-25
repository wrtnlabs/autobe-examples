import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_hot_posts_analytics_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  const guestToken = await authorize_guest_join(guestConnection, {
    body: {
      session_token: typia.random<string & tags.Format<"uuid">>(),
      device_id: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: null,
    },
  });
  // 2. Test successful response with valid pagination
  const validRequest = {
    sort: "hot",
    page: 1,
    limit: 10,
  } satisfies IRedditCloneContentPost.IRequest;
  const hotPosts =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      { body: validRequest },
    );
  typia.assert(hotPosts);
  // 3. Test pagination edge case - page 1
  const page1 =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      { body: { ...validRequest, page: 1 } },
    );
  TestValidator.equals("page 1 pagination", page1.pagination.current, 1);
  // 4. Test pagination with limit bounds
  const minLimit =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      { body: { ...validRequest, limit: 1 } },
    );
  TestValidator.equals("min limit", minLimit.pagination.limit, 1);
  const maxLimit =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      { body: { ...validRequest, limit: 100 } },
    );
  TestValidator.equals("max limit", maxLimit.pagination.limit, 100);
  // 5. Test response structure validation
  TestValidator.predicate("has data array", Array.isArray(hotPosts.data));
  TestValidator.predicate("has pagination info", !!hotPosts.pagination);
  // 6. Validate each post structure
  for (const post of hotPosts.data) {
    TestValidator.predicate("post has id", typeof post.id === "string");
    TestValidator.predicate("post has title", typeof post.title === "string");
    TestValidator.predicate("post has author", !!post.author);
    TestValidator.predicate("post has community", !!post.community);
    TestValidator.predicate(
      "post has vote score",
      typeof post.voteScore === "number",
    );
    TestValidator.predicate(
      "post has comment count",
      typeof post.commentCount === "number",
    );
  }
}
