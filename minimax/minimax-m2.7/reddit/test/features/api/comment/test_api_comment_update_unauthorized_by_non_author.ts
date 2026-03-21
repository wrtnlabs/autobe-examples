import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

/**
 * Test that a non-author member cannot edit another user's comment.
 *
 * Scenario:
 * 1. First member creates community, subscribes, creates post, and posts a comment
 * 2. Second member authenticates
 * 3. Second member attempts to edit first member's comment
 *
 * Expected: Returns 403 Forbidden with appropriate error message.
 * The comment author and content remain unchanged.
 */
export async function test_api_comment_update_unauthorized_by_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member authenticates
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {});
  // 2. First member creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      firstMemberConnection,
      {},
    );
  // 3. First member subscribes to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    firstMemberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. First member creates a post
  const post = await generate_random_reddit_clone_member_posts_create(
    firstMemberConnection,
    {
      body: {
        title: "Test post for comment edit authorization",
        communityName: community.name,
        type: "text",
      },
    },
  );
  // 5. First member creates a comment
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      firstMemberConnection,
      {
        body: {
          content: "Original comment content that should not be changed",
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Second member authenticates (different user)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // 7. Second member attempts to edit first member's comment (should fail)
  await TestValidator.httpError(
    "non-author should not be able to edit comment",
    403,
    async () =>
      await api.functional.redditClone.member.comments.update(
        secondMemberConnection,
        {
          commentId: comment.id,
          body: {
            content: "Hacked content by non-author",
          } satisfies IRedditCloneComment.IUpdate,
        },
      ),
  );
  // 8. Verify comment remains unchanged (author is still first member)
  TestValidator.equals(
    "comment author should remain unchanged",
    comment.author.username,
    firstMember.username,
  );
}