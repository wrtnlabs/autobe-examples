import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_posts_popular_feed_public_browsing(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const requestBase = {
    feed: "popular",
    page: 1,
    limit: 5,
  } satisfies ICommunityPlatformPost.IRequest;
  const first = await api.functional.communityPlatform.member.posts.index(
    guestConnection,
    {
      body: requestBase,
    },
  );
  typia.assert(first);
  const second = await api.functional.communityPlatform.member.posts.index(
    guestConnection,
    {
      body: requestBase,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "popular feed should be stable for identical requests",
    second,
    first,
  );
  TestValidator.equals(
    "popular feed should preserve requested page",
    first.pagination.current,
    1,
  );
  TestValidator.equals(
    "popular feed should preserve requested limit",
    first.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "popular feed should return non-negative pagination counts",
    first.pagination.records >= 0 && first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "popular feed should return no more than the requested limit",
    first.data.length <= first.pagination.limit,
  );
  const sortedNew = await api.functional.communityPlatform.member.posts.index(
    guestConnection,
    {
      body: {
        ...requestBase,
        sort: "new",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(sortedNew);
  const sortedTop = await api.functional.communityPlatform.member.posts.index(
    guestConnection,
    {
      body: {
        ...requestBase,
        sort: "top",
        topWindow: "all time",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(sortedTop);
  const sortedHot = await api.functional.communityPlatform.member.posts.index(
    guestConnection,
    {
      body: {
        ...requestBase,
        sort: "hot",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(sortedHot);
  const sortedControversial =
    await api.functional.communityPlatform.member.posts.index(guestConnection, {
      body: {
        ...requestBase,
        sort: "controversial",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(sortedControversial);
  TestValidator.predicate(
    "new sorting should return a valid page payload",
    sortedNew.pagination.pages >= 0 && sortedNew.pagination.records >= 0,
  );
  TestValidator.predicate(
    "top sorting should return a valid page payload",
    sortedTop.pagination.pages >= 0 && sortedTop.pagination.records >= 0,
  );
  TestValidator.predicate(
    "hot sorting should return a valid page payload",
    sortedHot.pagination.pages >= 0 && sortedHot.pagination.records >= 0,
  );
  TestValidator.predicate(
    "controversial sorting should return a valid page payload",
    sortedControversial.pagination.pages >= 0 &&
      sortedControversial.pagination.records >= 0,
  );
  const searchKeyword =
    first.data.length > 0
      ? (first.data[0].title.trim().split(/\s+/)[0] ??
        first.data[0].title.trim())
      : RandomGenerator.alphabets(3);
  const searched = await api.functional.communityPlatform.member.posts.index(
    guestConnection,
    {
      body: {
        ...requestBase,
        search: searchKeyword,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(searched);
  TestValidator.predicate(
    "search should preserve pagination metadata",
    searched.pagination.current === 1 &&
      searched.pagination.limit === requestBase.limit,
  );
  TestValidator.predicate(
    "search should not exceed requested limit",
    searched.data.length <= searched.pagination.limit,
  );
  TestValidator.predicate(
    "search results should be a subset of feed results when titles match",
    searched.data.every((item) =>
      first.data.some((original) => original.id === item.id),
    ),
  );
}
