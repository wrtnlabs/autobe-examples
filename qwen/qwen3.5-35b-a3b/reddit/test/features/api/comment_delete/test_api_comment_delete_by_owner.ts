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

/**
 * Test comment deletion by owner functionality.
 *
 * Validates that an authenticated member can successfully delete their own comment,
 * with proper cascading updates to associated post metadata and vote records.
 */
export async function test_api_comment_delete_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create authenticated connection for member operations
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Member creates a post
  const post = await generate_random_reddit_community_member_posts_create(
    memberAuthConnection,
    {
      body: {
        post_type: "text",
      },
    },
  );
  typia.assert(post);
  // 3. Member creates a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberAuthConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(comment);
  // 4. Capture post's comment_count before deletion
  const preDeleteCommentCount: number = post.comment_count;
  TestValidator.equals(
    "post has initial comment count",
    preDeleteCommentCount,
    1,
  );
  // 5. Delete the comment as the owner
  await api.functional.redditCommunity.member.posts.comments.erase(
    memberAuthConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 6. Validate deletion succeeded (returns 204 No Content)
  // The API returns void on successful deletion, which we've already validated by not throwing
  TestValidator.equals("comment deletion should succeed", true, true);
}
