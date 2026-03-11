import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = typia.random<IRedditLikeModerator.IJoin>();
  await authorize_moderator_join(moderatorConnection, {
    body: moderatorData,
  });
  typia.assert<IRedditLikeModerator.IAuthorized>(
    moderatorConnection.headers?.Authorization,
  );
  // 2. Create community as moderator
  const community = await generate_random_reddit_like_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IRedditLikeMember.IJoin>();
  await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert<IRedditLikeMember.IAuthorized>(
    memberConnection.headers?.Authorization,
  );
  // 4. Subscribe member to community (need subscription endpoint)
  // 5. Member creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Member creates a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Verify comment exists before deletion
  TestValidator.equals("comment exists", comment.post.id, post.id);
  TestValidator.equals("comment content", comment.content.length > 0, true);
  // 7. Switch back to moderator connection for deletion
  // 8. Moderator deletes the member's comment
  await api.functional.redditLike.member.comments.erase(moderatorConnection, {
    commentId: comment.id,
  });
  // 9. Validate comment is deleted (404 response)
  await TestValidator.httpError(
    "comment not found after deletion",
    404,
    async () => {
      await api.functional.redditLike.member.comments.erase(
        moderatorConnection,
        {
          commentId: comment.id,
        },
      );
    },
  );
  // Note: Post comment count decrement validation requires post retrieval endpoint which is not available in SDK
  // This would need additional SDK implementation to verify comment count changes
}
