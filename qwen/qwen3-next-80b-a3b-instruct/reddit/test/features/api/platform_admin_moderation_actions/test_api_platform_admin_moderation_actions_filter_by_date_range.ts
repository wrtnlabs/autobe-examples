import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationActionOfPost";
import type { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_moderation_actions_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResponse);
  // 2. Define a realistic date range filter for moderation actions (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const created_at_after = thirtyDaysAgo.toISOString();
  const created_at_before = now.toISOString();
  const limit = 10;
  // 3. Make single request with date range filter (no cursor-based pagination since cursor not returned)
  const request: IRedditCommunityModerationActionOfPost.IRequest = {
    created_at_after,
    created_at_before,
    limit,
    cursor: "", // Required by IRequest but no cursor returned in response
  };
  const response =
    await api.functional.redditCommunity.platformAdmin.moderation_actions.index(
      adminConnection,
      { body: request },
    );
  typia.assert(response);
  // 4. Validate that every moderation action returned is within the requested date range
  for (const action of response.data) {
    const actionDate = new Date(action.created_at);
    TestValidator.predicate(
      "action created_at within requested date range",
      actionDate >= thirtyDaysAgo && actionDate <= now,
    );
  }
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination current page equals 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested",
    response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records >= number of items returned",
    () => response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () => response.pagination.pages >= 1,
  );
  // 6. Validate cursor usage
  // Cursor is required in request but not returned in response - cannot validate cursor continuity
  // Instead validate that results contain at least some data if possible, or confirm filtering logic
  if (response.data.length > 0) {
    TestValidator.notEquals(
      "first and last moderation actions have different timestamps",
      response.data[0].created_at,
      response.data[response.data.length - 1].created_at,
    );
  }
}
