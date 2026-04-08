import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_comment_replies_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | undefined>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create a valid comment ID (random UUID)
  // Using a random UUID to test the endpoint with valid format
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Query replies endpoint as guest (no authentication header needed after join)
  const response = await api.functional.redditPlatform.guest.comments.replies(
    guestConnection,
    {
      commentId: commentId,
    },
  );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Validate pagination metadata for empty results
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("records count is 0", response.pagination.records, 0);
  TestValidator.equals("pages count is 0", response.pagination.pages, 0);
  // 6. Validate data array is empty
  TestValidator.equals("data array is empty", response.data, []);
  // 7. Validate limit is set (default pagination limit)
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
}
