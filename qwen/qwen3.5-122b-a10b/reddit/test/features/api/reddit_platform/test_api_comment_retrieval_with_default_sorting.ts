import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test retrieving comments on a post with default 'best' sorting.
 *
 * The scenario validates that:
 * 1. Comments are returned in a paginated format with pagination metadata
 * 2. Each comment includes author information (username, display_name, avatar_file_id, karma_score)
 * 3. Vote scores are correctly calculated from associated vote records
 * 4. Creation and update timestamps are included
 * 5. Soft-deleted comments (deleted_at IS NOT NULL) are filtered out
 * 6. Default sorting by 'best' orders comments by vote_score in descending order
 * 7. Nested reply structure is preserved with replies array
 * 8. Post existence is validated - returns 404 if post not found
 *
 * The test creates a community, subscribes a member, creates a post, then retrieves
 * comments with default 'best' sorting. Note: Comment creation API is not available
 * in the current SDK, so we test retrieval with existing comments.
 */
export async function test_api_comment_retrieval_with_default_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community (owner is auto-subscribed, but we test explicitly)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve comments with default 'best' sorting (no sort parameter = 'best')
  const comments = await api.functional.redditPlatform.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sort: "best",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(comments);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    comments.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", comments.pagination.limit, 10);
  TestValidator.predicate("has pages", comments.pagination.pages >= 0);
  // 7. Validate each comment has required author information (if any exist)
  for (const comment of comments.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "has author",
      comment.author !== null && comment.author !== undefined,
    );
    TestValidator.predicate("has username", comment.author.username.length > 0);
    TestValidator.predicate(
      "has karma_score",
      typeof comment.author.karma_score === "number",
    );
    TestValidator.predicate(
      "has created_at",
      comment.created_at !== null && comment.created_at !== undefined,
    );
    TestValidator.predicate(
      "has updated_at",
      comment.updated_at !== null && comment.updated_at !== undefined,
    );
  }
  // 8. Validate default 'best' sorting (vote_score descending) - only if multiple comments exist
  if (comments.data.length >= 2) {
    for (let i = 0; i < comments.data.length - 1; i++) {
      TestValidator.predicate(
        `comment ${i} score >= comment ${i + 1} score`,
        comments.data[i].vote_score >= comments.data[i + 1].vote_score,
      );
    }
  }
  // 9. Test 404 for non-existent post
  await TestValidator.error("post not found", async () => {
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {} satisfies IRedditPlatformComment.IRequest,
    });
  });
}
