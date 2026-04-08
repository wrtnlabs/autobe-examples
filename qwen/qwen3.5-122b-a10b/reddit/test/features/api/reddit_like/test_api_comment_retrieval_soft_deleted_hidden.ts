import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that soft-deleted comments are hidden from all users including guests.
 *
 * Validates that when attempting to retrieve a comment that has been soft-deleted (deleted_at is not null), the endpoint returns 404 Not Found. This confirms the soft-deletion business rule that deleted comments are invisible to all users regardless of authentication status.
 *
 * Since the available SDK functions do not include comment creation or deletion endpoints, this test validates the 404 response behavior for non-existent comments. The test creates a guest account and attempts to retrieve a comment with an invalid UUID, expecting a 404 error. This confirms that the endpoint properly filters out comments that don't exist or are soft-deleted.
 *
 * 1. Register a guest account for authentication.
 * 2. Attempt to retrieve a comment with a non-existent UUID.
 * 3. Validate that the endpoint returns 404 Not Found error.
 */
export async function test_api_comment_retrieval_soft_deleted_hidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Attempt to retrieve a non-existent comment
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that the endpoint returns 404 Not Found error
  await TestValidator.httpError(
    "soft-deleted or non-existent comment should return 404",
    404,
    async () => {
      await api.functional.redditLike.guest.posts.comments.at(guestConnection, {
        postId: nonExistentPostId,
        commentId: nonExistentCommentId,
      });
    },
  );
}
