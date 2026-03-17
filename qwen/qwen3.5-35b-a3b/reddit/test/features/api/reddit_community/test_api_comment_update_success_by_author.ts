import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_update_success_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and connection setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  // 2. Create a post in the community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 3. Create a comment on that post
  const initialComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(initialComment);
  // 4. Store initial state
  const originalBody = initialComment.body;
  const originalCreatedAt = initialComment.created_at;
  const originalUpdatedAt = initialComment.updated_at;
  const originalVoteScore = initialComment.vote_score;
  const originalAuthorId = initialComment.author.id;
  const originalPostId = initialComment.post.id;
  const commentId = initialComment.id;
  // 5. Prepare new comment body for update
  const newBody = RandomGenerator.paragraph({ sentences: 2 });
  // 6. Update the comment
  const updatedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: commentId,
        body: {
          body: newBody,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 7. Validate the update
  // Verify body changed
  TestValidator.notEquals(
    "comment body changed",
    originalBody,
    updatedComment.body,
  );
  TestValidator.equals("new body matches", updatedComment.body, newBody);
  // Verify updated_at changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    originalUpdatedAt,
    updatedComment.updated_at,
  );
  // Verify other fields unchanged
  TestValidator.equals("comment id unchanged", commentId, updatedComment.id);
  TestValidator.equals(
    "author id unchanged",
    originalAuthorId,
    updatedComment.author.id,
  );
  TestValidator.equals(
    "post id unchanged",
    originalPostId,
    updatedComment.post.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    originalCreatedAt,
    updatedComment.created_at,
  );
  TestValidator.equals(
    "vote score unchanged",
    originalVoteScore,
    updatedComment.vote_score,
  );
}
