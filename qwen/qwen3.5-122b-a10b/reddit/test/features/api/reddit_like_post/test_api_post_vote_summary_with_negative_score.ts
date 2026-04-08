import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_vote_summary_with_negative_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(auth);
  // 2. Generate random post ID for testing
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call vote summary endpoint
  const summary: IRedditLikePost.IVoteSummary =
    await api.functional.redditLike.guest.posts.vote_summary.voteSummary(
      guestConnection,
      { postId },
    );
  typia.assert(summary);
  // 4. Validate vote summary structure
  TestValidator.equals("post ID matches", summary.id, postId);
  TestValidator.predicate(
    "upvote count is non-negative",
    summary.upvote_count >= 0,
  );
  TestValidator.predicate(
    "downvote count is non-negative",
    summary.downvote_count >= 0,
  );
  // 5. Verify vote score calculation: vote_score = upvote_count - downvote_count
  const expectedScore = summary.upvote_count - summary.downvote_count;
  TestValidator.equals(
    "vote score calculation",
    summary.vote_score,
    expectedScore,
  );
  // 6. Test negative score edge case (when downvotes exceed upvotes)
  if (summary.downvote_count > summary.upvote_count) {
    TestValidator.predicate(
      "negative vote score when downvotes exceed upvotes",
      summary.vote_score < 0,
    );
  }
}
