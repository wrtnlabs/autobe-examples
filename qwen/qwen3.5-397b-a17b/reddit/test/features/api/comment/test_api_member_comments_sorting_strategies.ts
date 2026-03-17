import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_member_comments_sorting_strategies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post for comments
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    },
  );
  typia.assert(post);
  // 5. Create multiple comments with different timestamps
  const comment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "First comment - oldest",
          parent_comment_id: null,
        },
      },
    );
  typia.assert(comment1);
  // Wait to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const comment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "Second comment - middle",
          parent_comment_id: null,
        },
      },
    );
  typia.assert(comment2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const comment3 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: "Third comment - newest",
          parent_comment_id: null,
        },
      },
    );
  typia.assert(comment3);
  // 6. Test 'new' sorting (most recent first by created_at DESC)
  const newSorted = await api.functional.redditClone.members.comments.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.predicate(
    "new sorting returns comments",
    newSorted.data.length > 0,
  );
  // Verify newest comment appears first in 'new' sorting
  if (newSorted.data.length >= 1) {
    TestValidator.equals(
      "new sorting - first comment is most recent",
      newSorted.data[0].id,
      comment3.id,
    );
  }
  // 7. Test 'best' sorting (highest vote score first)
  const bestSorted = await api.functional.redditClone.members.comments.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        sort: "best",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(bestSorted);
  TestValidator.predicate(
    "best sorting returns comments",
    bestSorted.data.length > 0,
  );
  // 8. Test 'controversial' sorting (many votes with score close to zero)
  const controversialSorted =
    await api.functional.redditClone.members.comments.index(memberConnection, {
      memberId: memberAuth.id,
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(controversialSorted);
  TestValidator.predicate(
    "controversial sorting returns comments",
    controversialSorted.data.length > 0,
  );
  // 9. Test date range filtering with sorting
  const dateFrom = new Date(Date.now() - 1000 * 60 * 60 * 24); // 24 hours ago
  const dateTo = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now
  const dateFiltered = await api.functional.redditClone.members.comments.index(
    memberConnection,
    {
      memberId: memberAuth.id,
      body: {
        sort: "new",
        date_from: dateFrom.toISOString(),
        date_to: dateTo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filtered sorting returns comments",
    dateFiltered.data.length > 0,
  );
  // 10. Validate that all comments belong to the member
  for (const comment of newSorted.data) {
    TestValidator.equals(
      "comment author matches member",
      comment.author.id,
      memberAuth.id,
    );
  }
  // 11. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    newSorted.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    newSorted.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    newSorted.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    newSorted.pagination.pages >= 0,
  );
}
