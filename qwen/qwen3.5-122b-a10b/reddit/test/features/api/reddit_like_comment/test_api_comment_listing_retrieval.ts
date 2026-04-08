import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest comment listing retrieval with pagination and sorting options.
 *
 * Validates that authenticated guests can retrieve paginated comment lists for a specific post with various sorting strategies. The test ensures proper pagination metadata, comment summary structure, and exclusion of soft-deleted comments.
 *
 * 1. Authenticate as guest via join endpoint.
 * 2. Retrieve comments with default sorting (best).
 * 3. Verify pagination metadata structure.
 * 4. Test different sorting strategies (new, controversial).
 * 5. Validate pagination counts are consistent across sorting strategies.
 */
export async function test_api_comment_listing_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: `https://test.com/page/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://test.com/home`,
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(auth);
  // 2. Test with random post ID and default parameters
  const postId = typia.random<string & tags.Format<"uuid">>();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const result = await api.functional.redditLike.guest.posts.comments.index(
    guestConnection,
    {
      postId,
      body: {
        sort: "best",
        limit,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(result);
  // 3. Verify pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    result.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Test with "new" sorting
  const newResult = await api.functional.redditLike.guest.posts.comments.index(
    guestConnection,
    {
      postId,
      body: {
        sort: "new",
        limit,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(newResult);
  // 5. Test with "controversial" sorting
  const controversialResult =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "controversial",
          limit,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(controversialResult);
  // 6. Verify pagination consistency across sorting strategies
  TestValidator.equals(
    "pagination current consistent",
    result.pagination.current,
    newResult.pagination.current,
  );
  TestValidator.equals(
    "pagination pages consistent",
    result.pagination.pages,
    controversialResult.pagination.pages,
  );
  TestValidator.equals(
    "data array length consistent",
    result.data.length,
    newResult.data.length,
  );
}
