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

export async function test_api_member_popular_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(registered);
  // 2. Create posts in multiple communities
  const communities: IRedditLikeCommunity.ISummary[] = [];
  for (let i = 0; i < 3; i++) {
    const community =
      await api.functional.redditLike.member.posts.popular.index(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            type: "text" as const,
            content: RandomGenerator.content(),
            communityName: `community-${i}`,
          } satisfies IRedditLikePost.IRequest,
        },
      );
    typia.assert(community);
    communities.push(community.data[0].community);
  }
  // 3. Test pagination
  const limit = 2;
  // Page 1
  const page1 = await api.functional.redditLike.member.posts.popular.index(
    memberConnection,
    {
      body: {
        title: "",
        type: "text" as const,
        communityName: communities[0].name,
        page: 1,
        limit,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 pagination", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, limit);
  TestValidator.equals("page 1 data count", page1.data.length, 2);
  // Page 2
  const page2 = await api.functional.redditLike.member.posts.popular.index(
    memberConnection,
    {
      body: {
        title: "",
        type: "text" as const,
        communityName: communities[0].name,
        page: 2,
        limit,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 pagination", page2.pagination.current, 2);
  TestValidator.notEquals("pages differ", page1.data[0].id, page2.data[0].id);
  // Page beyond available range
  const pageBeyond = await api.functional.redditLike.member.posts.popular.index(
    memberConnection,
    {
      body: {
        title: "",
        type: "text" as const,
        communityName: communities[0].name,
        page: 100,
        limit,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "beyond page pagination",
    pageBeyond.pagination.current,
    100,
  );
  TestValidator.equals("beyond page data empty", pageBeyond.data.length, 0);
  // 4. Verify pagination metadata
  TestValidator.predicate("valid pagination", page1.pagination.pages >= 1);
  TestValidator.predicate("valid records", page1.pagination.records >= 0);
}
