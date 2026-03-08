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

export async function test_api_community_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditLikeGuest.IJoin>(),
  });
  typia.assert(guest);
  // 2. Test with a known community or use a test community name
  // Note: In a real scenario, we would create a community with posts first
  // For now, we'll test with a placeholder community name
  const communityName = "test-community";
  // 3. Test pagination metadata with various limit values
  const limit = 5;
  // Page 1
  const page1 = await api.functional.redditLike.guest.communities.feed.search(
    guestConnection,
    {
      communityName: communityName,
      body: {
        limit: limit,
      },
    },
  );
  typia.assert(page1);
  // Validate pagination structure
  TestValidator.predicate(
    "page 1 has valid pagination",
    page1.pagination !== undefined,
  );
  TestValidator.predicate(
    "page 1 has valid data array",
    Array.isArray(page1.data),
  );
  // Test with different page numbers
  const page2 = await api.functional.redditLike.guest.communities.feed.search(
    guestConnection,
    {
      communityName: communityName,
      body: {
        page: 2,
        limit: limit,
      },
    },
  );
  typia.assert(page2);
  // Test boundary conditions
  const invalidPage =
    await api.functional.redditLike.guest.communities.feed.search(
      guestConnection,
      {
        communityName: communityName,
        body: {
          page: 999,
          limit: limit,
        },
      },
    );
  typia.assert(invalidPage);
  // Validate empty result for out-of-range page
  TestValidator.predicate(
    "out-of-range page has empty data",
    invalidPage.data.length === 0,
  );
  // Test extreme limit values
  const smallLimit =
    await api.functional.redditLike.guest.communities.feed.search(
      guestConnection,
      {
        communityName: communityName,
        body: {
          limit: 1,
        },
      },
    );
  typia.assert(smallLimit);
  const largeLimit =
    await api.functional.redditLike.guest.communities.feed.search(
      guestConnection,
      {
        communityName: communityName,
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(largeLimit);
  // 4. Test different sorting options (if supported)
  const hotSort = await api.functional.redditLike.guest.communities.feed.search(
    guestConnection,
    {
      communityName: communityName,
      body: {
        sort: "hot",
        limit: 5,
      },
    },
  );
  typia.assert(hotSort);
  const newSort = await api.functional.redditLike.guest.communities.feed.search(
    guestConnection,
    {
      communityName: communityName,
      body: {
        sort: "new",
        limit: 5,
      },
    },
  );
  typia.assert(newSort);
}
