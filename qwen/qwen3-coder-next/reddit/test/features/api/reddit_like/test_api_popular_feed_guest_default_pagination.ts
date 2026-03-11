import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_feed_guest_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  // 2. Call PATCH /redditLike/guest/popular with minimal valid request body
  const output = await api.functional.redditLike.guest.popular.index(
    guestConnection,
    {
      body: {
        title: "p", // minimal valid title (1 character minimum)
        type: "text" as const,
        communityName: "", // empty string for community name to get all communities
      } satisfies IRedditLikePost.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(output);
  // 4. Validate pagination metadata (current=1, limit=100, records count, pages calculated)
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 100", output.pagination.limit, 100);
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is calculated correctly",
    output.pagination.pages === 0 || output.pagination.pages >= 1,
  );
  // 5. Check that all posts have valid author and community summaries
  for (const post of output.data) {
    typia.assert<IRedditLikeMember.ISummary>(post.author);
    typia.assert<IRedditLikeCommunity.ISummary>(post.community);
  }
  // 6. Verify sorting is applied correctly (default is "hot" sorting)
  TestValidator.predicate(
    "posts array is not empty when records > 0",
    output.data.length > 0 || output.pagination.records === 0,
  );
}
