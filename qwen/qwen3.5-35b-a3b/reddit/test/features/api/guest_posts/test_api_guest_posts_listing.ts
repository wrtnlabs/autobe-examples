import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
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

export async function test_api_guest_posts_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestSession);
  // 2. Create connection with guest token
  const postsConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: guestSession.token.access },
  };
  // 3. List posts with default parameters (page=1, limit=20, sort='new')
  const postsResponse = await api.functional.redditPlatform.guest.posts.index(
    postsConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "new",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(postsResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    postsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", postsResponse.pagination.limit, 20);
  TestValidator.equals(
    "total records matches actual data length",
    postsResponse.pagination.records,
    postsResponse.data.length,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    postsResponse.pagination.pages,
    Math.ceil(
      postsResponse.pagination.records / postsResponse.pagination.limit,
    ),
  );
  // 5. Validate soft-deleted posts are filtered out
  for (const post of postsResponse.data) {
    TestValidator.equals("post is not soft-deleted", post.deleted_at, null);
  }
  // 6. Validate sorting (newest first by created_at DESC)
  if (postsResponse.data.length > 1) {
    for (let i = 1; i < postsResponse.data.length; i++) {
      const prevPost = postsResponse.data[i - 1];
      const currPost = postsResponse.data[i];
      const prevDate = new Date(prevPost.created_at).getTime();
      const currDate = new Date(currPost.created_at).getTime();
      TestValidator.predicate(
        "posts are sorted by created_at DESC",
        prevDate >= currDate,
      );
    }
  }
}
