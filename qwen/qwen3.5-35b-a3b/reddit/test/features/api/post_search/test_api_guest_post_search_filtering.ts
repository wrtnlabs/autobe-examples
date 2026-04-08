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

export async function test_api_guest_post_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for unauthenticated access to public post search
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: "https://test.example.com",
      referrer: "https://search.example.com",
    },
  });
  typia.assert(guestSession);
  // 2. Test filter by community_id - test endpoint accepts the filter parameter
  const searchRequest1: IRedditPlatformPost.ISearchRequest = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const result1 = await api.functional.redditPlatform.guest.search.posts.index(
    guestConnection,
    {
      body: searchRequest1,
    },
  );
  typia.assert(result1);
  TestValidator.equals(
    "community filter pagination records",
    result1.pagination.records,
    0,
  );
  TestValidator.equals(
    "community filter empty results",
    result1.data.length,
    0,
  );
  // 3. Test filter by search term in title - test endpoint accepts search parameter
  const searchRequest2: IRedditPlatformPost.ISearchRequest = {
    search: RandomGenerator.name(2),
  };
  const result2 = await api.functional.redditPlatform.guest.search.posts.index(
    guestConnection,
    {
      body: searchRequest2,
    },
  );
  typia.assert(result2);
  TestValidator.equals(
    "search filter pagination records",
    result2.pagination.records,
    0,
  );
  TestValidator.equals("search filter empty results", result2.data.length, 0);
  // 4. Test filter by post_type - test endpoint accepts post_type parameter
  const searchRequest3: IRedditPlatformPost.ISearchRequest = {
    post_type: "text" as const,
  };
  const result3 = await api.functional.redditPlatform.guest.search.posts.index(
    guestConnection,
    {
      body: searchRequest3,
    },
  );
  typia.assert(result3);
  TestValidator.equals(
    "post_type filter pagination records",
    result3.pagination.records,
    0,
  );
  TestValidator.equals(
    "post_type filter empty results",
    result3.data.length,
    0,
  );
  // 5. Test combined filters (post_type AND community_id) - test endpoint accepts multiple filters
  const searchRequest4: IRedditPlatformPost.ISearchRequest = {
    post_type: "text" as const,
    community_id: typia.random<string & tags.Format<"uuid">>(),
    search: "test",
  };
  const result4 = await api.functional.redditPlatform.guest.search.posts.index(
    guestConnection,
    {
      body: searchRequest4,
    },
  );
  typia.assert(result4);
  TestValidator.equals(
    "combined filter pagination records",
    result4.pagination.records,
    0,
  );
  TestValidator.equals("combined filter empty results", result4.data.length, 0);
  // 6. Test exclude_ids - test endpoint accepts exclude_ids parameter
  const searchRequest5: IRedditPlatformPost.ISearchRequest = {
    exclude_ids: [typia.random<string & tags.Format<"uuid">>()],
  };
  const result5 = await api.functional.redditPlatform.guest.search.posts.index(
    guestConnection,
    {
      body: searchRequest5,
    },
  );
  typia.assert(result5);
  TestValidator.equals(
    "exclude_ids filter pagination records",
    result5.pagination.records,
    0,
  );
  TestValidator.equals(
    "exclude_ids filter empty results",
    result5.data.length,
    0,
  );
  // 7. Test pagination with filters - records count reflects filtered set
  const searchRequest6: IRedditPlatformPost.ISearchRequest = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
    limit: 1,
  };
  const result6 = await api.functional.redditPlatform.guest.search.posts.index(
    guestConnection,
    {
      body: searchRequest6,
    },
  );
  typia.assert(result6);
  TestValidator.equals("pagination limit applied", result6.data.length, 0);
  TestValidator.equals(
    "pagination records count",
    result6.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination limit in pagination object",
    result6.pagination.limit,
    1,
  );
  // 8. Test empty result when no posts match filter criteria
  const searchRequest7: IRedditPlatformPost.ISearchRequest = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
    post_type: "image" as const,
  };
  const result7 = await api.functional.redditPlatform.guest.search.posts.index(
    guestConnection,
    {
      body: searchRequest7,
    },
  );
  typia.assert(result7);
  TestValidator.equals(
    "empty result pagination records",
    result7.pagination.records,
    0,
  );
  TestValidator.equals("empty result data length", result7.data.length, 0);
}
