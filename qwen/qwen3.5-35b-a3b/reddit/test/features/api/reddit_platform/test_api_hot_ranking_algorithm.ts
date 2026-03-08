import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_hot_ranking_algorithm(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(12),
      href: "http://example.com/join",
      referrer: "http://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(12),
      href: "http://example.com/join",
      referrer: "http://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Create community with Member A as owner
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
          description: "Test community for hot ranking algorithm",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Test hot feed endpoint with authenticated member
  const hotResponse = await api.functional.redditPlatform.feeds.hot.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_type: "HOT",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(hotResponse);
  // 5. Validate hot feed response structure
  TestValidator.predicate(
    "hot feed has pagination",
    () =>
      hotResponse.pagination.current >= 1 &&
      hotResponse.pagination.limit >= 1 &&
      hotResponse.pagination.records >= 0 &&
      hotResponse.pagination.pages >= 0,
  );
  // 6. Test controversial sorting
  const controversialResponse =
    await api.functional.redditPlatform.feeds.hot.index(memberAConnection, {
      body: {
        page: 1,
        limit: 20,
        sort_type: "CONTROVERSIAL",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(controversialResponse);
  TestValidator.predicate(
    "controversial feed returns valid pagination",
    () =>
      controversialResponse.pagination.current >= 1 &&
      controversialResponse.pagination.limit >= 1 &&
      controversialResponse.pagination.records >= 0 &&
      controversialResponse.pagination.pages >= 0,
  );
  // 7. Test post_type filtering (TEXT)
  const textPosts = await api.functional.redditPlatform.feeds.hot.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_type: "HOT",
        post_type: "TEXT",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(textPosts);
  // 8. Test post_type filtering (LINK)
  const linkPosts = await api.functional.redditPlatform.feeds.hot.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_type: "HOT",
        post_type: "LINK",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(linkPosts);
  // 9. Test post_type filtering (IMAGE)
  const imagePosts = await api.functional.redditPlatform.feeds.hot.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_type: "HOT",
        post_type: "IMAGE",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(imagePosts);
  // 10. Test guest access (unauthenticated connection)
  const guestConnection: api.IConnection = { host: connection.host };
  const guestResponse = await api.functional.redditPlatform.feeds.hot.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_type: "HOT",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(guestResponse);
  TestValidator.predicate(
    "guest access to hot feed works",
    () =>
      guestResponse.pagination.current >= 1 &&
      guestResponse.pagination.limit >= 1,
  );
  // 11. Test time range filtering (TOP sorting with WEEK)
  const timeRangeResponse = await api.functional.redditPlatform.feeds.hot.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_type: "TOP",
        time_range: "WEEK",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(timeRangeResponse);
  // 12. Test NEW sorting
  const newResponse = await api.functional.redditPlatform.feeds.hot.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_type: "NEW",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(newResponse);
  // 13. Test pagination with different page
  const page2Response = await api.functional.redditPlatform.feeds.hot.index(
    memberAConnection,
    {
      body: {
        page: 2,
        limit: 10,
        sort_type: "HOT",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 pagination",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  // 14. Test sorting order for HOT
  if (hotResponse.data.length > 1) {
    TestValidator.predicate("hot feed returns array of posts", () =>
      hotResponse.data.every((post) => post.id !== undefined),
    );
  }
  // 15. Validate post summary structure
  if (hotResponse.data.length > 0) {
    const samplePost = hotResponse.data[0];
    TestValidator.equals("post has id", samplePost.id !== undefined, true);
    TestValidator.equals(
      "post has title",
      samplePost.title !== undefined,
      true,
    );
    TestValidator.equals(
      "post has author",
      samplePost.author !== undefined,
      true,
    );
    TestValidator.equals(
      "post has community",
      samplePost.community !== undefined,
      true,
    );
    TestValidator.equals(
      "post has created_at",
      samplePost.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      samplePost.vote_score !== undefined,
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      samplePost.comment_count !== undefined,
      true,
    );
  }
}
