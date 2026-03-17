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

export async function test_api_guest_member_posts_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account for authentication
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
  // 2. Generate member UUID for testing
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test with search filter - retrieve posts matching search text
  const searchParams: IRedditClonePost.IRequest = {
    search: "test",
    sort: "new",
    page: 1,
    limit: 10,
  };
  const searchResult =
    await api.functional.redditClone.guest.members.posts.index(
      guestConnection,
      {
        memberId: memberId,
        body: searchParams,
      },
    );
  typia.assert(searchResult);
  // 4. Test with sort='top' and timeFilter='this_month'
  const topParams: IRedditClonePost.IRequest = {
    sort: "top",
    timeFilter: "this_month",
    page: 1,
    limit: 20,
  };
  const topResult = await api.functional.redditClone.guest.members.posts.index(
    guestConnection,
    {
      memberId: memberId,
      body: topParams,
    },
  );
  typia.assert(topResult);
  // 5. Test with controversial sort and different time filter
  const controversialParams: IRedditClonePost.IRequest = {
    sort: "controversial",
    timeFilter: "this_week",
    page: 2,
    limit: 15,
  };
  const controversialResult =
    await api.functional.redditClone.guest.members.posts.index(
      guestConnection,
      {
        memberId: memberId,
        body: controversialParams,
      },
    );
  typia.assert(controversialResult);
  // 6. Test with hot sort and all_time timeFilter
  const hotParams: IRedditClonePost.IRequest = {
    sort: "hot",
    timeFilter: "all_time",
    page: 1,
    limit: 50,
  };
  const hotResult = await api.functional.redditClone.guest.members.posts.index(
    guestConnection,
    {
      memberId: memberId,
      body: hotParams,
    },
  );
  typia.assert(hotResult);
  // 7. Test with only pagination parameters (no sort or search)
  const paginationOnlyParams: IRedditClonePost.IRequest = {
    page: 1,
    limit: 25,
  };
  const paginationResult =
    await api.functional.redditClone.guest.members.posts.index(
      guestConnection,
      {
        memberId: memberId,
        body: paginationOnlyParams,
      },
    );
  typia.assert(paginationResult);
  // 8. Validate pagination relationships are consistent
  TestValidator.predicate(
    "pages calculation is correct",
    paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ) || paginationResult.pagination.records === 0,
  );
  // 9. Validate data length does not exceed limit
  TestValidator.predicate(
    "data length respects limit",
    paginationResult.data.length <= paginationResult.pagination.limit,
  );
  // 10. Validate current page matches request
  TestValidator.equals(
    "current page matches request",
    paginationResult.pagination.current,
    1,
  );
}
