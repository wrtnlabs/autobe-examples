import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieval of a paginated post list with a nonexistent community ID by a guest user.
 *
 * This test registers a guest user to receive authorization tokens and uses that guest context
 * to query posts of a community with a random UUID that does not exist.
 * It validates that the response is an empty post list with correct pagination metadata indicating zero records and zero pages.
 * The response must conform to the expected IPageICommunityPlatformPost.ISummary schema.
 * The test ensures no errors or failures occur.
 *
 * Dependencies:
 * - Guest user registration to simulate guest context for realistic API access
 */
export async function test_api_community_guest_browse_posts_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration and authorization
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {}, // ICommunityPlatformGuest.IJoin is empty object
  });
  // 2. Generate a random UUID for nonexistent community ID
  const nonexistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve posts of nonexistent community as guest
  const output =
    await api.functional.communityPlatform.guest.communities.posts.index(
      guestConnection,
      { communityId: nonexistentCommunityId },
    );
  // 4. Assert the response structure
  typia.assert(output);
  // 5. Validate that data array is empty
  TestValidator.equals("post list should be empty", output.data.length, 0);
  // 6. Validate that pagination total records and pages are 0
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
  // 7. Validate current page and limit are positive or zero values (pagination must be valid)
  TestValidator.predicate(
    "current page is number >= 0",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit per page is number >= 0",
    output.pagination.limit >= 0,
  );
}
