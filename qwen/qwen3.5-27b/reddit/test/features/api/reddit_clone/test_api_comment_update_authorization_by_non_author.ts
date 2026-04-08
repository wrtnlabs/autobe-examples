import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a non-author member cannot update another member's comment.
 *
 * Validates the authorization rule that only the comment author can edit their own comments. The test creates two separate member accounts, where Member A creates a post and comment, then Member B attempts to update Member A's comment. The system must reject this unauthorized update attempt with a 403 Forbidden error, ensuring comment content integrity and proper access control.
 *
 * 1. Member A authenticates and creates a post in a community.
 * 2. Member A creates a comment on their own post.
 * 3. Member B authenticates as a separate user.
 * 4. Member B attempts to update Member A's comment with new content.
 * 5. The system rejects the update with 403 Forbidden error.
 * 6. The 403 error confirms the comment was not modified (authorization enforced).
 */
export async function test_api_comment_update_authorization_by_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A authentication (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {},
  );
  typia.assert(post);
  // 3. Member A creates a comment on their post
  const originalComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(originalComment);
  // 4. Member B authentication (non-author attempting update)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Member B attempts to update Member A's comment (should fail with 403)
  // The 403 error confirms that:
  // - The authorization check is working correctly
  // - Non-authors cannot modify comments
  // - The original comment content remains unchanged
  await TestValidator.httpError(
    "non-author cannot update comment - authorization enforced",
    403,
    async () =>
      await api.functional.redditClone.member.posts.comments.update(
        memberBConnection,
        {
          postId: post.id,
          commentId: originalComment.id,
          body: {
            content: "This is an unauthorized edit attempt by Member B",
          } satisfies IRedditCloneComment.IUpdate,
        },
      ),
  );
  // 6. Verify that the members are different (additional validation)
  TestValidator.notEquals(
    "Member A and Member B are different users",
    memberA.id,
    memberB.id,
  );
}
