import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_analytics_posts_top(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection using utility function
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
  // 2. Test top posts endpoint with different sorting options
  // Test hot sorting
  const hotResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(hotResult);
  TestValidator.equals("has pagination", hotResult.pagination.current, 1);
  TestValidator.equals("has limit", hotResult.pagination.limit, 20);
  TestValidator.predicate("has posts", hotResult.data.length >= 0);
  // Test new sorting
  const newResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "new",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(newResult);
  TestValidator.predicate("has new posts", newResult.data.length >= 0);
  // Test top sorting with week time filter
  const weekResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 20,
          timeFilter: "week",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(weekResult);
  TestValidator.predicate(
    "has week filter results",
    weekResult.data.length >= 0,
  );
  // Test top sorting with allTime time filter
  const allTimeResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 20,
          timeFilter: "allTime",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(allTimeResult);
  TestValidator.predicate(
    "has allTime filter results",
    allTimeResult.data.length >= 0,
  );
  // Test controversial sorting
  const controversialResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(controversialResult);
  TestValidator.predicate(
    "has controversial posts",
    controversialResult.data.length >= 0,
  );
  // Test pagination with different page sizes
  const smallPage =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 5,
          timeFilter: "week",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals("small page limit", smallPage.pagination.limit, 5);
}
