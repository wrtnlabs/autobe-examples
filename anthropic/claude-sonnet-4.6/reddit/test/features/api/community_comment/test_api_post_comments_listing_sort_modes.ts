import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_comments_listing_sort_modes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create at least 3 comments sequentially to ensure different timestamps
  const comment1 = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: `First comment: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      },
    },
  );
  typia.assert(comment1);
  const comment2 = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: `Second comment: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      },
    },
  );
  typia.assert(comment2);
  const comment3 = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: `Third comment: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      },
    },
  );
  typia.assert(comment3);
  // Use a guest connection (no auth required for listing comments)
  const guestConnection: api.IConnection = { host: connection.host };
  // 6. Test Sort = 'new' (most recently created first)
  const newSortResult = await api.functional.community.posts.comments.index(
    guestConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
      } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(newSortResult);
  // Validate 'new' sort: newest comment should appear first
  if (newSortResult.data.length >= 2) {
    const first = newSortResult.data[0];
    const second = newSortResult.data[1];
    TestValidator.predicate(
      "new sort: first comment should be newer or equal to second",
      () =>
        new Date(first.created_at).getTime() >=
        new Date(second.created_at).getTime(),
    );
  }
  // Validate the most recently created comment (comment3) appears first with 'new' sort
  if (newSortResult.data.length > 0) {
    TestValidator.equals(
      "new sort: most recently created comment appears first",
      newSortResult.data[0].id,
      comment3.id,
    );
  }
  // 7. Test Sort = 'best' (highest vote_score first)
  const bestSortResult = await api.functional.community.posts.comments.index(
    guestConnection,
    {
      postId: post.id,
      body: {
        sort: "best",
      } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(bestSortResult);
  // Validate 'best' sort: comments ordered by vote_score descending
  if (bestSortResult.data.length >= 2) {
    const firstScore = bestSortResult.data[0].vote_score;
    const lastScore =
      bestSortResult.data[bestSortResult.data.length - 1].vote_score;
    TestValidator.predicate(
      "best sort: first comment vote_score >= last comment vote_score",
      () => firstScore >= lastScore,
    );
  }
  // Validate pagination structure for best sort
  TestValidator.predicate(
    "best sort: valid pagination structure - records >= 3",
    () => bestSortResult.pagination.records >= 3,
  );
  // 8. Test Sort = 'controversial'
  const controversialSortResult =
    await api.functional.community.posts.comments.index(guestConnection, {
      postId: post.id,
      body: {
        sort: "controversial",
      } satisfies ICommunityComment.IRequest,
    });
  typia.assert(controversialSortResult);
  // 9. Test Pagination: page=1, limit=2
  const paginatedResult = await api.functional.community.posts.comments.index(
    guestConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        page: 1,
        limit: 2,
      } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(paginatedResult);
  // Validate pagination constraints
  TestValidator.predicate(
    "pagination: at most 2 records returned in data",
    () => paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination: limit equals 2",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination: current page equals 1",
    paginatedResult.pagination.current,
    1,
  );
  // Since we created 3 comments, pages should be > 1 when limit=2
  TestValidator.predicate(
    "pagination: total pages > 1 when 3 comments and limit=2",
    () => paginatedResult.pagination.pages > 1,
  );
}
