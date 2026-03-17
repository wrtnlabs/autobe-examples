import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_user_posts_pagination_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Create authenticated connection for subsequent requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...guestConnection.headers!,
    Authorization: guestAuth.token.access,
  };
  // 3. Generate a random user ID (the target user whose posts we'll retrieve)
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test pagination - request page 2 with limit 10
  const paginationPage2 =
    await api.functional.redditCommunity.guest.users.posts.index(
      authenticatedConnection,
      {
        userId: targetUserId,
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(paginationPage2);
  TestValidator.equals("page 2 current", paginationPage2.pagination.current, 2);
  TestValidator.equals("page 2 limit", paginationPage2.pagination.limit, 10);
  TestValidator.predicate(
    "page 2 has pagination metadata",
    paginationPage2.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 2 has records",
    paginationPage2.pagination.records >= 0,
  );
  // 5. Test community filtering
  const targetCommunityId = typia.random<string & tags.Format<"uuid">>();
  const communityFiltered =
    await api.functional.redditCommunity.guest.users.posts.index(
      authenticatedConnection,
      {
        userId: targetUserId,
        body: {
          community_id: targetCommunityId,
        },
      },
    );
  typia.assert(communityFiltered);
  TestValidator.predicate(
    "community filter has valid pagination",
    communityFiltered.pagination.current >= 1,
  );
  // 6. Test search filtering
  const searchKeyword = RandomGenerator.paragraph({ sentences: 2 });
  const searchFiltered =
    await api.functional.redditCommunity.guest.users.posts.index(
      authenticatedConnection,
      {
        userId: targetUserId,
        body: {
          search: searchKeyword,
        },
      },
    );
  typia.assert(searchFiltered);
  TestValidator.predicate(
    "search filter has valid pagination",
    searchFiltered.pagination.current >= 1,
  );
  // 7. Test combined filtering - pagination + community
  const combinedPaginationCommunity =
    await api.functional.redditCommunity.guest.users.posts.index(
      authenticatedConnection,
      {
        userId: targetUserId,
        body: {
          page: 1,
          limit: 20,
          community_id: targetCommunityId,
        },
      },
    );
  typia.assert(combinedPaginationCommunity);
  TestValidator.equals(
    "combined page current",
    combinedPaginationCommunity.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined limit",
    combinedPaginationCommunity.pagination.limit,
    20,
  );
  // 8. Test combined filtering - pagination + search
  const combinedPaginationSearch =
    await api.functional.redditCommunity.guest.users.posts.index(
      authenticatedConnection,
      {
        userId: targetUserId,
        body: {
          page: 1,
          limit: 15,
          search: searchKeyword,
        },
      },
    );
  typia.assert(combinedPaginationSearch);
  TestValidator.equals(
    "combined search page current",
    combinedPaginationSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined search limit",
    combinedPaginationSearch.pagination.limit,
    15,
  );
}
