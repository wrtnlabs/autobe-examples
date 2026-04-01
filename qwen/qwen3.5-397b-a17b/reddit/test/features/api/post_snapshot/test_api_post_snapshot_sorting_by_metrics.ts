import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test sorting functionality for post snapshot history by different metrics.
 *
 * **Test Flow:**
 * 1. Register a guest account using device fingerprint authentication
 * 2. Retrieve post snapshots sorted by vote_score in descending order
 * 3. Retrieve post snapshots sorted by vote_score in ascending order
 * 4. Retrieve post snapshots sorted by comment_count in descending order
 * 5. Retrieve post snapshots sorted by comment_count in ascending order
 * 6. Verify that snapshots are correctly ordered by the specified sort field
 *
 * **Validation Points:**
 * - Request includes sort parameter with values: vote_score and comment_count
 * - Request includes order parameter with values: desc and asc
 * - Snapshots are correctly ordered by the specified field in the specified direction
 * - When sorted by vote_score, snapshots with higher scores appear first (desc) or last (asc)
 * - When sorted by comment_count, snapshots with more comments appear first (desc) or last (asc)
 * - Sorting works independently of the default created_at ordering
 *
 * **Business Logic:**
 * - Verify that users can analyze post evolution by different engagement metrics
 * - Confirm that sorting enables identification of peak engagement snapshots
 * - Validate that metric-based sorting supports content analysis and historical trending
 */
export async function test_api_post_snapshot_sorting_by_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Generate a post ID for testing snapshots
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve snapshots sorted by vote_score descending
  const voteScoreDesc =
    await api.functional.redditCommunity.guest.posts.snapshots.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "vote_score",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(voteScoreDesc);
  // 4. Retrieve snapshots sorted by vote_score ascending
  const voteScoreAsc =
    await api.functional.redditCommunity.guest.posts.snapshots.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "vote_score",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(voteScoreAsc);
  // 5. Retrieve snapshots sorted by comment_count descending
  const commentCountDesc =
    await api.functional.redditCommunity.guest.posts.snapshots.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "comment_count",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(commentCountDesc);
  // 6. Retrieve snapshots sorted by comment_count ascending
  const commentCountAsc =
    await api.functional.redditCommunity.guest.posts.snapshots.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "comment_count",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(commentCountAsc);
  // 7. Validate sorting order for vote_score descending
  if (voteScoreDesc.data.length > 1) {
    for (let i = 0; i < voteScoreDesc.data.length - 1; i++) {
      TestValidator.predicate(
        `vote_score desc order [${i}] >= [${i + 1}]`,
        voteScoreDesc.data[i].vote_score >=
          voteScoreDesc.data[i + 1].vote_score,
      );
    }
  }
  // 8. Validate sorting order for vote_score ascending
  if (voteScoreAsc.data.length > 1) {
    for (let i = 0; i < voteScoreAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `vote_score asc order [${i}] <= [${i + 1}]`,
        voteScoreAsc.data[i].vote_score <= voteScoreAsc.data[i + 1].vote_score,
      );
    }
  }
  // 9. Validate sorting order for comment_count descending
  if (commentCountDesc.data.length > 1) {
    for (let i = 0; i < commentCountDesc.data.length - 1; i++) {
      TestValidator.predicate(
        `comment_count desc order [${i}] >= [${i + 1}]`,
        commentCountDesc.data[i].comment_count >=
          commentCountDesc.data[i + 1].comment_count,
      );
    }
  }
  // 10. Validate sorting order for comment_count ascending
  if (commentCountAsc.data.length > 1) {
    for (let i = 0; i < commentCountAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `comment_count asc order [${i}] <= [${i + 1}]`,
        commentCountAsc.data[i].comment_count <=
          commentCountAsc.data[i + 1].comment_count,
      );
    }
  }
}
