import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_popular_feed_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Test popular feed retrieval with valid request
  const popularFeed =
    await api.functional.redditLike.member.posts.popular.index(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(),
          type: "text" as const,
          communityName: "testcommunity",
          page: 1,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(popularFeed);
  // 3. Validate feed structure
  TestValidator.equals(
    "feed has data array",
    Array.isArray(popularFeed.data),
    true,
  );
  TestValidator.equals(
    "feed has pagination",
    popularFeed.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination has valid records",
    () => popularFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    () => popularFeed.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination has valid current",
    popularFeed.pagination.current,
    1,
  );
}
