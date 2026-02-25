import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_admin_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin" + Math.random().toString(36).substring(2) + "@test.com",
      password: "admin123",
      display_name: "Test Admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Regular user setup and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: "user" + Math.random().toString(36).substring(2) + "@test.com",
      password: "user123",
      username: "testuser" + Math.random().toString(36).substring(2),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: "testcommunity" + Math.random().toString(36).substring(2),
          description: "Test community description",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  // 4. Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: "Test Post Title",
        community_name: community.name,
        post_type: "text",
        text_content: "This is a test post content for voting functionality.",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 5. Create comment
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: "This is a test comment for vote removal testing.",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  // 6. Admin casts initial vote (upvote)
  const initialVote =
    await api.functional.communityPlatform.admin.comments.votes.update(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  // Store initial karma for comparison
  const initialKarma = initialVote.author.karma;
  // 7. Admin removes vote using 'none'
  const voteRemoval =
    await api.functional.communityPlatform.admin.comments.votes.update(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "none",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  // 8. Validate vote removal reset aggregated score
  if (voteRemoval.vote_score !== 0) {
    throw new Error(
      `Vote score should be reset to 0 after removal, but got ${voteRemoval.vote_score}`,
    );
  }
  // 9. Verify karma impact was reversed
  if (voteRemoval.author.karma !== initialKarma) {
    throw new Error(
      `Karma should be reversed to original value ${initialKarma}, but got ${voteRemoval.author.karma}`,
    );
  }
  // 10. Verify one-vote-per-user constraint by attempting another vote
  const finalVote =
    await api.functional.communityPlatform.admin.comments.votes.update(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  // 11. Validate the new vote is properly recorded
  if (finalVote.vote_score !== -1) {
    throw new Error(
      `New vote should be recorded as -1, but got ${finalVote.vote_score}`,
    );
  }
}
