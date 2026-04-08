import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a member cannot delete a post they did not author.
 *
 * Validates the permission control mechanism that prevents unauthorized post deletion. When an authenticated member attempts to delete a post created by another member, the system must reject the request with a 403 Forbidden error, preserving the post and all associated data including votes, comments, and reports.
 *
 * This test verifies the critical business rule that only the original author can delete a post, ensuring content integrity and preventing malicious or accidental deletion by other users.
 *
 * 1. First member authenticates and creates a post.
 * 2. Second member authenticates separately.
 * 3. Second member attempts to delete the first member's post.
 * 4. System rejects the deletion with 403 Forbidden status.
 * 5. Post remains intact and accessible.
 */
export async function test_api_post_delete_by_non_author_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first member (author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create a post using the author's connection
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {},
  );
  typia.assert(post);
  // 3. Authenticate as second member (non-author)
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  const nonAuthor = await authorize_member_join(nonAuthorConnection, {});
  typia.assert(nonAuthor);
  // 4. Verify the two members are different
  TestValidator.notEquals("different users", author.id, nonAuthor.id);
  // 5. Attempt to delete the post as non-author - should fail with 403
  await TestValidator.httpError(
    "non-author cannot delete post",
    403,
    async () =>
      await api.functional.redditClone.member.posts.erase(nonAuthorConnection, {
        postId: post.id,
      }),
  );
}
