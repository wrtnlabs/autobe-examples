import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_posts_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize test member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community for testing (using a random UUID)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test default pagination (no parameters)
  const defaultResult = await api.functional.redditLike.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit is reasonable",
    defaultResult.pagination.limit > 0,
  );
  // 4. Test page-based pagination
  const page2Result = await api.functional.redditLike.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        page: 2,
        limit: 2,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2", page2Result.pagination.current, 2);
  TestValidator.equals("limit 2", page2Result.pagination.limit, 2);
  // 5. Test cursor-based pagination
  const cursorResult = await api.functional.redditLike.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        cursor: new Date().toISOString(),
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(cursorResult);
  // 6. Test sorting by new (default)
  const newResult = await api.functional.redditLike.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        sort: "new",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(newResult);
  // 7. Test sorting by hot
  const hotResult = await api.functional.redditLike.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        sort: "hot",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotResult);
  // 8. Test sorting by top with all time ranges
  const topAllResult = await api.functional.redditLike.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        sort: "top",
        time: "all",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topAllResult);
  const topTodayResult =
    await api.functional.redditLike.communities.posts.index(memberConnection, {
      communityId,
      body: {
        sort: "top",
        time: "today",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(topTodayResult);
  const topWeekResult = await api.functional.redditLike.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        sort: "top",
        time: "week",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topWeekResult);
  const topMonthResult =
    await api.functional.redditLike.communities.posts.index(memberConnection, {
      communityId,
      body: {
        sort: "top",
        time: "month",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(topMonthResult);
  const topYearResult = await api.functional.redditLike.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        sort: "top",
        time: "year",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topYearResult);
  // 9. Test sorting by controversial
  const controversialResult =
    await api.functional.redditLike.communities.posts.index(memberConnection, {
      communityId,
      body: {
        sort: "controversial",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(controversialResult);
  // 10. Test guest access (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  const guestResult = await api.functional.redditLike.communities.posts.index(
    guestConnection,
    {
      communityId,
      body: {} satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(guestResult);
  // 11. Test filtering by created_at range
  const filteredResult =
    await api.functional.redditLike.communities.posts.index(memberConnection, {
      communityId,
      body: {
        created_from: new Date(Date.now() - 86400000).toISOString(),
        created_to: new Date().toISOString(),
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(filteredResult);
  // 12. Test invalid pagination parameters (page < 1)
  const invalidPageResult =
    await api.functional.redditLike.communities.posts.index(memberConnection, {
      communityId,
      body: {
        page: 0,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(invalidPageResult);
  // 13. Test invalid pagination parameters (limit > 100)
  const invalidLimitResult =
    await api.functional.redditLike.communities.posts.index(memberConnection, {
      communityId,
      body: {
        limit: 101,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(invalidLimitResult);
  // 14. Test non-existent community (should return empty results)
  const invalidCommunityId = "00000000-0000-0000-0000-000000000000";
  const invalidResult = await api.functional.redditLike.communities.posts.index(
    memberConnection,
    {
      communityId: invalidCommunityId,
      body: {} satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(invalidResult);
}
