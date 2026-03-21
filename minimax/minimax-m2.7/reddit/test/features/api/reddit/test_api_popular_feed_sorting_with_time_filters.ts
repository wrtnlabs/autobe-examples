import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_sorting_with_time_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection for accessing popular feed
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Test all four sorting algorithms without time filter
  const sorts = ["hot", "new", "top", "controversial"] as const;
  for (const sort of sorts) {
    const response =
      await api.functional.redditClone.member.posts.popular.index(
        memberConnection,
        {
          body: {
            sort,
            limit: 10,
            page: 1,
          } satisfies IRedditClonePostLink.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.equals(
      "pagination exists",
      response.pagination !== null,
      true,
    );
    TestValidator.predicate(
      "pagination has current page",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination has limit",
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination has records",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has pages",
      response.pagination.pages >= 0,
    );
    // Validate data array exists
    TestValidator.equals("data is array", Array.isArray(response.data), true);
  }
  // Test time range filters with 'top' sort
  const timeRanges = ["all", "day", "week", "month", "year"] as const;
  for (const timeRange of timeRanges) {
    const response =
      await api.functional.redditClone.member.posts.popular.index(
        memberConnection,
        {
          body: {
            sort: "top",
            timeRange,
            limit: 10,
            page: 1,
          } satisfies IRedditClonePostLink.IRequest,
        },
      );
    typia.assert(response);
    // Validate response structure for time-filtered request
    TestValidator.equals("has pagination", response.pagination !== null, true);
    TestValidator.equals("has data array", Array.isArray(response.data), true);
  }
  // Test time range filters with 'controversial' sort
  for (const timeRange of timeRanges) {
    const response =
      await api.functional.redditClone.member.posts.popular.index(
        memberConnection,
        {
          body: {
            sort: "controversial",
            timeRange,
            limit: 10,
            page: 1,
          } satisfies IRedditClonePostLink.IRequest,
        },
      );
    typia.assert(response);
    // Validate response structure
    TestValidator.equals("has pagination", response.pagination !== null, true);
    TestValidator.equals("has data array", Array.isArray(response.data), true);
  }
  // Test pagination with different limit and page values
  const paginatedResponse =
    await api.functional.redditClone.member.posts.popular.index(
      memberConnection,
      {
        body: {
          sort: "hot",
          limit: 5,
          page: 2,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Verify pagination reflects requested values
  TestValidator.equals(
    "page matches request",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedResponse.pagination.limit,
    5,
  );
  // Test post type filtering combined with sorting
  const postTypes = ["text", "link", "image"] as const;
  for (const postType of postTypes) {
    const response =
      await api.functional.redditClone.member.posts.popular.index(
        memberConnection,
        {
          body: {
            sort: "new",
            postType,
            limit: 10,
            page: 1,
          } satisfies IRedditClonePostLink.IRequest,
        },
      );
    typia.assert(response);
    // Validate all returned posts have the specified type
    for (const post of response.data) {
      TestValidator.equals("post type matches filter", post.type, postType);
    }
  }
}
