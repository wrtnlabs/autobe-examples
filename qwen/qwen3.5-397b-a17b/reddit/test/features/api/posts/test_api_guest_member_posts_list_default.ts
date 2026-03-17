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
 * Test guest user retrieving paginated list of posts from a member's profile.
 *
 * This test validates the primary success path for the guest member posts list endpoint.
 * Since post/member creation APIs are not available in the test scope, this test focuses
 * on validating the response structure and pagination metadata.
 *
 * Test Steps:
 * 1. Create guest account for authentication context
 * 2. Generate a valid member UUID for the path parameter
 * 3. Call endpoint with default pagination parameters (page=1, limit=20)
 * 4. Validate response structure and pagination metadata
 */
export async function test_api_guest_member_posts_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account for authentication context
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Generate a valid member UUID for the path parameter
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call endpoint with default pagination parameters
  const response = await api.functional.redditClone.guest.members.posts.index(
    guestConnection,
    {
      memberId: memberId,
      body: {
        page: 1,
        limit: 20,
        sort: "new",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  // 4. Validate complete response structure (includes all nested objects)
  typia.assert(response);
  // 5. Validate pagination metadata relationships (business logic, not types)
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit matches request",
    response.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly from records and limit",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 6. Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(response.data));
}
