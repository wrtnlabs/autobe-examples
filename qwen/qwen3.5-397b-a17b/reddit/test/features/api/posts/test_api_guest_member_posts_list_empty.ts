import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the edge case where a guest user retrieves posts from a member who has no posts.
 *
 * **Test Steps:**
 * 1. Create a guest connection (no authentication required for this endpoint)
 * 2. Generate a valid member UUID for testing
 * 3. Call the posts endpoint with default pagination parameters
 *
 * **Validation Points:**
 * - Response returns HTTP 200 with empty data array
 * - Pagination metadata shows: records=0, pages=0, current=1, limit=20
 * - Response structure is valid with pagination and data fields
 * - No errors are returned for members with zero posts
 */
export async function test_api_guest_member_posts_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection (no auth required for this endpoint)
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a valid member UUID for testing
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // Call the posts endpoint for a member with no posts
  const response = await api.functional.redditClone.guest.members.posts.index(
    guestConnection,
    {
      memberId,
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  // Validate response structure
  typia.assert(response);
  // Validate empty data array
  TestValidator.equals("data array is empty", response.data, []);
  // Validate pagination metadata for empty results
  TestValidator.equals("records count", response.pagination.records, 0);
  TestValidator.equals("pages count", response.pagination.pages, 0);
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
}
