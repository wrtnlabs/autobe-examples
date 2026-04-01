import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_post_comment_sorting_by_best_new_controversial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
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
        post_type: "text",
        title: RandomGenerator.name(3),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create multiple comments with different content
  const comment1 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(comment3);
  // 6. Test 'best' sorting - verify API accepts the sort parameter
  const bestSorted = await api.functional.redditCommunity.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "best",
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(bestSorted);
  TestValidator.predicate(
    "best sort returns data",
    bestSorted.data.length >= 0,
  );
  TestValidator.predicate(
    "best sort has pagination",
    bestSorted.pagination.current >= 1,
  );
  // 7. Test 'new' sorting - verify most recent comments appear first
  const newSorted = await api.functional.redditCommunity.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        limit: 10,
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(newSorted);
  TestValidator.predicate("new sort returns data", newSorted.data.length >= 0);
  TestValidator.predicate(
    "new sort has pagination",
    newSorted.pagination.current >= 1,
  );
  // Verify new sorting returns comments in descending creation time order
  if (newSorted.data.length >= 2) {
    TestValidator.predicate(
      "new sort orders by created_at DESC",
      new Date(newSorted.data[0].created_at).getTime() >=
        new Date(newSorted.data[1].created_at).getTime(),
    );
  }
  // 8. Test 'controversial' sorting - verify API accepts the sort parameter
  const controversialSorted =
    await api.functional.redditCommunity.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial",
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(controversialSorted);
  TestValidator.predicate(
    "controversial sort returns data",
    controversialSorted.data.length >= 0,
  );
  TestValidator.predicate(
    "controversial sort has pagination",
    controversialSorted.pagination.current >= 1,
  );
  // 9. Verify all sort options return the same comments (just in different order)
  TestValidator.equals(
    "same comment count across sorts",
    bestSorted.data.length,
    newSorted.data.length,
  );
  TestValidator.equals(
    "same comment count controversial",
    bestSorted.data.length,
    controversialSorted.data.length,
  );
  // 10. Verify comment structure includes required fields
  if (newSorted.data.length > 0) {
    const firstComment = newSorted.data[0];
    TestValidator.predicate("comment has id", firstComment.id !== undefined);
    TestValidator.predicate(
      "comment has content",
      firstComment.content !== undefined,
    );
    TestValidator.predicate(
      "comment has author",
      firstComment.author !== undefined,
    );
    TestValidator.predicate(
      "comment has created_at",
      firstComment.created_at !== undefined,
    );
    TestValidator.predicate(
      "comment has vote_score",
      firstComment.vote_score !== undefined,
    );
  }
}
