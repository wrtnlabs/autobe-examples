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
 * Validates post ownership verification by testing association mismatch detection.
 *
 * Verifies that when retrieving a comment with a postId that does not match
 * the comment's actual parent post, the system correctly identifies the mismatch
 * and returns a 404 Not Found response.
 *
 * 1. Authenticate as a guest user for read-only access.
 * 2. Generate a random commentId (UUID format).
 * 3. Generate a mismatched postId (UUID format, different from comment's actual post).
 * 4. Attempt to retrieve the comment with the mismatched postId.
 * 5. Validate that the API returns 404 Not Found.
 */
export async function test_api_comment_post_association_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeCommunityGuest.IJoin,
  });
  typia.assert<IRedditLikeCommunityGuest.IAuthorized>(guest);
  // 2. Generate mismatched IDs
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3 & 4 & 5. Validate 404 on association mismatch
  await TestValidator.httpError(
    "returns 404 when comment's post_id does not match provided postId",
    404,
    async () => {
      await api.functional.redditLikeCommunity.guest.posts.comments.at(
        guestConnection,
        {
          postId,
          commentId,
        },
      );
    },
  );
}
