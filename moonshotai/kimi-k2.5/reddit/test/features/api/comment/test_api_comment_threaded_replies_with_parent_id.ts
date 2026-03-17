import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_threaded_replies_with_parent_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 3: Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create a parent comment (top-level)
  const parentComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: null,
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(parentComment);
  // Step 6: Create direct replies to the parent comment (level 1)
  const replyCount = 3;
  const replies: IRedditLikeComment[] = [];
  for (let i = 0; i < replyCount; i++) {
    const reply =
      await generate_random_reddit_like_member_posts_comments_create(
        memberConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
            parentId: parentComment.id,
          } satisfies IRedditLikeComment.ICreate,
          params: {
            postId: post.id,
          },
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }
  // Step 7: Create deeper nested replies to replies[0] (level 2 - grandchildren of parent)
  const nestedReply =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parentId: replies[0].id,
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(nestedReply);
  // Step 8: Query comments filtered by parentId (should return only direct replies)
  const filterRequest: IRedditLikeComment.IRequest = {
    sort: "NEW",
    page: 1,
    limit: 10,
    search: null,
    authorId: null,
    parentId: parentComment.id,
    includeDeleted: false,
  } satisfies IRedditLikeComment.IRequest;
  const filteredComments =
    await api.functional.redditLike.member.comments.index(memberConnection, {
      body: filterRequest,
    });
  typia.assert(filteredComments);
  // Step 9: Validate response - should contain only direct replies (level 1)
  TestValidator.equals(
    "all comments should be direct replies to parent",
    filteredComments.data.length,
    replyCount,
  );
  // Verify each returned comment has parent_id matching the parent comment
  for (const comment of filteredComments.data) {
    TestValidator.equals(
      "comment parent_id should match parent comment",
      comment.parent_id,
      parentComment.id,
    );
  }
  // Step 10: Verify nested replies (level 2) are NOT included when filtering by parentId
  const hasNestedReply = filteredComments.data.some(
    (c) => c.id === nestedReply.id,
  );
  TestValidator.equals(
    "nested replies should not appear in parentId filtered results",
    hasNestedReply,
    false,
  );
  // Step 11: Verify pagination structure
  TestValidator.predicate(
    "pagination should be present",
    filteredComments.pagination !== undefined &&
      filteredComments.pagination !== null,
  );
  TestValidator.equals(
    "pagination current page",
    filteredComments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredComments.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records",
    filteredComments.pagination.records,
    replyCount,
  );
  // Step 12: Verify pagination pages calculation
  const expectedPages = Math.ceil(replyCount / 10);
  TestValidator.equals(
    "pagination pages",
    filteredComments.pagination.pages,
    expectedPages,
  );
  // Step 13: Verify parent_id field presence for each comment
  for (const comment of filteredComments.data) {
    TestValidator.predicate(
      "parent_id should be present",
      comment.parent_id !== undefined,
    );
  }
}
