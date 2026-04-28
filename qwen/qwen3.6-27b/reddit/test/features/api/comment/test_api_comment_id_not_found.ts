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
 * Tests that retrieving a non-existent comment returns a 404 Not Found error.
 *
 * Validates the comment existence check performed by the comment retrieval endpoint by providing a randomly generated UUID that does not correspond to any stored comment in the system. Confirms that the API correctly rejects requests for invalid comment identifiers with an appropriate HTTP 404 status code.
 *
 * 1. Guest authenticates to obtain read-only platform access tokens.
 * 2. A random UUID is generated for the post ID and comment ID, guaranteed to not exist in the database.
 * 3. Retrieves a comment using the non-existent IDs.
 * 4. Validates that a 404 Not Found HTTP error is thrown.
 */
export async function test_api_comment_id_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Generate non-existent UUIDs
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3 & 4. Attempt to retrieve non-existent comment and validate 404 error
  await TestValidator.httpError(
    "non-existent comment returns 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.guest.posts.comments.at(
        guestConnection,
        {
          postId: fakePostId,
          commentId: fakeCommentId,
        },
      );
    },
  );
}
