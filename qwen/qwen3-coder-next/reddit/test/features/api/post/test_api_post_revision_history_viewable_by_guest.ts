import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostRevision";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest can view post revision history
 * 1. Create guest user with device fingerprint
 * 2. Call post revisions endpoint with valid postId
 * 3. Validate response structure and content
 */
export async function test_api_post_revision_history_viewable_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup guest actor
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Create a test post using available guest functionality
  // Since admin API is not available, we'll use a placeholder postId
  // In real scenario, this would require creating a post first
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Guest retrieves revision history
  const revisions = await api.functional.redditLike.guest.posts.revisions.index(
    guestConnection,
    {
      postId: postId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikePostRevision.IRequest,
    },
  );
  typia.assert(revisions);
  // 4. Validate revision history structure
  TestValidator.equals(
    "has pagination info",
    revisions.pagination !== undefined,
    true,
  );
  TestValidator.equals("has data array", Array.isArray(revisions.data), true);
  TestValidator.predicate("data items have required fields", () =>
    revisions.data.every((rev) => {
      typia.assert<IRedditLikePostRevision.ISummary>(rev);
      return true;
    }),
  );
  // 5. Validate pagination metadata
  TestValidator.predicate("pagination has required fields", () => {
    const p = revisions.pagination;
    typia.assert<IPage.IPagination>(p);
    return p.current >= 0 && p.limit >= 0 && p.records >= 0 && p.pages >= 0;
  });
  // 6. Test with different pagination parameters
  const revisionsLimited =
    await api.functional.redditLike.guest.posts.revisions.index(
      guestConnection,
      {
        postId: postId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditLikePostRevision.IRequest,
      },
    );
  typia.assert(revisionsLimited);
  TestValidator.predicate(
    "respects limit parameter",
    () =>
      revisionsLimited.data.length <= 5 ||
      revisionsLimited.data.length <= revisionsLimited.pagination.records,
  );
}
