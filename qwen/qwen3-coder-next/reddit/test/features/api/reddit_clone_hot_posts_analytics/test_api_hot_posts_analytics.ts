import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_hot_posts_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditCloneGuest.IJoin>(),
  });
  typia.assert(guestAuthorized);
  // Test hot posts analytics with various sorting and pagination parameters
  const hotPostsResponse =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(hotPostsResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    hotPostsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    hotPostsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "has records",
    hotPostsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    hotPostsResponse.pagination.pages >= 0,
  );
  // Validate posts array structure
  TestValidator.predicate(
    "has posts array",
    Array.isArray(hotPostsResponse.data),
  );
  TestValidator.predicate(
    "posts count matches limit",
    hotPostsResponse.data.length <= 10,
  );
  // Test with different pagination parameters
  const limitedPostsResponse =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "hot",
          page: 1,
          limit: 5,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(limitedPostsResponse);
  TestValidator.equals(
    "pagination limit applied",
    limitedPostsResponse.data.length,
    5,
  );
  // Test second page
  const secondPageResponse =
    await api.functional.redditClone.guest.analytics.posts.hot.index(
      guestConnection,
      {
        body: {
          sort: "hot",
          page: 2,
          limit: 10,
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page number",
    secondPageResponse.pagination.current,
    2,
  );
}
