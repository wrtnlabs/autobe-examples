import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IRedditLikeCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityGuest";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest retrieval of a single comment by postId and commentId.
 *
 * Establishes guest authentication and retrieves a specific comment from a post, validating the complete response structure includes the comment body, author identity (username, email, created_at), post summary (id, title, post_type), engagement metrics (voteScore), timestamp fields (createdAt, updatedAt, deletedAt), and the recursive nested childComments reply tree.
 *
 * 1. Guest authenticates via join endpoint with randomized session context.
 * 2. Comment is retrieved using valid postId and commentId parameters.
 * 3. Validate full IRedditLikeCommunityPostComment entity structure with all required fields populated.
 * 4. Confirm relational fields (author, post) contain expected identity data.
 * 5. Verify nested childComments array structure for threaded replies.
 */
export async function test_api_comment_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {},
  });
  // 2. Retrieve comment by postId and commentId
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const comment =
    await api.functional.redditLikeCommunity.guest.posts.comments.at(
      guestConnection,
      { postId, commentId },
    );
  typia.assert(comment);
  // 3. Validate relational consistency - comment matches requested IDs
  TestValidator.equals("comment id matches request", comment.id, commentId);
  TestValidator.equals("post id matches request", comment.post.id, postId);
  // 4. Validate business content - author and comment have meaningful data
  TestValidator.predicate("comment body is not empty", comment.body.length > 0);
  TestValidator.predicate(
    "author has username",
    comment.author.username.length > 0,
  );
  TestValidator.predicate("post has title", comment.post.title.length > 0);
}
