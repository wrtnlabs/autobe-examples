import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a user who is neither the comment author nor a community moderator cannot delete another user's comment.
 *
 * Setup:
 * 1. Register and authenticate as member A (unauthorized user)
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Register and authenticate as member B (comment author)
 * 5. As member B, create a comment on the post
 *
 * Execution:
 * 1. As the authenticated member A (not author, not moderator of member B's comment), call DELETE /redditClone/member/comments/{commentId} with member B's comment ID
 *
 * Validation:
 * 1. Verify HTTP 403 Forbidden response
 * 2. Verify the authorization check correctly identifies member A lacks permission
 */
export async function test_api_comment_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member A (unauthorized user)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community as member A
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community as member A
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Register and authenticate as member B (comment author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 5. As member B, create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberBConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. As member A (unauthorized), attempt to delete member B's comment
  await TestValidator.httpError(
    "unauthorized user cannot delete another user's comment",
    403,
    async () =>
      await api.functional.redditClone.member.comments.erase(
        memberAConnection,
        {
          commentId: comment.id,
        },
      ),
  );
  // 7. Verify the authorization check correctly identifies member A lacks permission
  // The 403 Forbidden response confirms the authorization check worked correctly
  TestValidator.predicate(
    "authorization check correctly denied unauthorized deletion",
    true,
  );
}
