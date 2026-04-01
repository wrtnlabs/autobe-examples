import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_post_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve snapshots with pagination - first page
  const page1 =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // 6. Verify pagination metadata
  TestValidator.predicate("current page is 1", page1.pagination.current === 1);
  TestValidator.predicate("limit is 10", page1.pagination.limit === 10);
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1.pagination.pages >= 0,
  );
  // 7. Test with different limit value
  const page2 =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          sort: "created_at",
          order: "desc",
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.predicate("limit is 5", page2.pagination.limit === 5);
  // 8. Test page 2 with limit 5 (if there are enough records)
  if (page2.pagination.records > 5) {
    const page3 =
      await api.functional.redditCommunity.member.posts.snapshots.index(
        memberConnection,
        {
          postId: post.id,
          body: {
            page: 2,
            limit: 5,
            sort: "created_at",
            order: "desc",
          } satisfies IRedditCommunityPostSnapshot.IRequest,
        },
      );
    typia.assert(page3);
    TestValidator.predicate(
      "current page is 2",
      page3.pagination.current === 2,
    );
    TestValidator.predicate(
      "page 2 data length <= limit",
      page3.data.length <= 5,
    );
  }
  // 9. Test with different sorting options
  const sortedPage =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          sort: "vote_score",
          order: "desc",
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(sortedPage);
  // 10. Test boundary condition - page beyond total pages
  const highPage =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 9999,
          limit: 10,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(highPage);
  TestValidator.predicate(
    "high page current is bounded",
    highPage.pagination.current >= 1,
  );
  // 11. Test with date range filters
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const dateFilteredPage =
    await api.functional.redditCommunity.member.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          from: from.toISOString(),
          to: now.toISOString(),
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredPage);
  TestValidator.predicate(
    "date filtered page has valid pagination",
    dateFilteredPage.pagination.current >= 1,
  );
}
