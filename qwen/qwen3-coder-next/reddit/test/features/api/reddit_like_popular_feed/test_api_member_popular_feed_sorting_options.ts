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

export async function test_api_member_popular_feed_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate test member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create test communities
  const communityNames: string[] = ArrayUtil.repeat(3, () =>
    RandomGenerator.alphabets(8),
  );
  const communities: IRedditLikeCommunity.ISummary[] = communityNames.map(
    (name) => ({
      name,
      icon_url: null,
      subscriber_count: 0,
    }),
  );
  // 3. Create test posts directly through the API
  for (let i = 0; i < 15; i++) {
    const communityIndex = i % 3;
    const type = i % 3 === 0 ? "text" : i % 3 === 1 ? "link" : "image";
    // Create time difference for new sorting test
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - i * 2);
    await api.functional.redditLike.member.posts.popular.index(
      memberConnection,
      {
        body: {
          title: `Test Post ${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          type: type satisfies IRedditLikePost.IRequest["type"],
          content:
            type === "text"
              ? RandomGenerator.content({ paragraphs: 2 })
              : undefined,
          url: type === "link" ? "https://example.com" + i : undefined,
          image_url:
            type === "image"
              ? "https://example.com/image" + i + ".png"
              : undefined,
          communityName: communities[communityIndex].name,
          page: 1,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  }
  // 4. Test hot sorting (default behavior)
  const hotResult = await api.functional.redditLike.member.posts.popular.index(
    memberConnection,
    {
      body: {
        title: "Hot Test",
        type: "text" satisfies IRedditLikePost.IRequest["type"],
        communityName: communities[0].name,
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotResult);
  TestValidator.equals("hot has pagination", hotResult.pagination.current, 1);
  TestValidator.predicate("hot has data", hotResult.data.length > 0);
  // 5. Test new sorting (new posts first)
  const newResult = await api.functional.redditLike.member.posts.popular.index(
    memberConnection,
    {
      body: {
        title: "New Test",
        type: "text" satisfies IRedditLikePost.IRequest["type"],
        communityName: communities[0].name,
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newResult);
  TestValidator.equals("new has pagination", newResult.pagination.current, 1);
  TestValidator.predicate("new has data", newResult.data.length > 0);
  // 6. Test top sorting with different time filters
  const topAllTime = await api.functional.redditLike.member.posts.popular.index(
    memberConnection,
    {
      body: {
        title: "Top Test",
        type: "text" satisfies IRedditLikePost.IRequest["type"],
        communityName: communities[0].name,
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topAllTime);
  TestValidator.predicate("topAllTime has data", topAllTime.data.length > 0);
  // 7. Test controversial sorting
  const controversialResult =
    await api.functional.redditLike.member.posts.popular.index(
      memberConnection,
      {
        body: {
          title: "Controversial Test",
          type: "text" satisfies IRedditLikePost.IRequest["type"],
          communityName: communities[0].name,
          page: 1,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(controversialResult);
  TestValidator.equals(
    "controversial has pagination",
    controversialResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "controversial has data",
    controversialResult.data.length > 0,
  );
  // 8. Test pagination
  const page1 = await api.functional.redditLike.member.posts.popular.index(
    memberConnection,
    {
      body: {
        title: "Page1 Test",
        type: "text" satisfies IRedditLikePost.IRequest["type"],
        communityName: communities[0].name,
        page: 1,
        limit: 5,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 5);
  TestValidator.equals("page1 has 5 items", page1.data.length, 5);
  const page2 = await api.functional.redditLike.member.posts.popular.index(
    memberConnection,
    {
      body: {
        title: "Page2 Test",
        type: "text" satisfies IRedditLikePost.IRequest["type"],
        communityName: communities[0].name,
        page: 2,
        limit: 5,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 limit", page2.pagination.limit, 5);
  TestValidator.equals("page2 has 5 items", page2.data.length, 5);
  TestValidator.notEquals(
    "page2 different from page1",
    page1.data[0].id,
    page2.data[0].id,
  );
}
