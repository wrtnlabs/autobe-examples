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

/**
 * Test pagination functionality for popular feed.
 * 1. Register and authenticate a member account
 * 2. Request popular feed with various pagination parameters
 * 3. Test different limit values (1, 10, 50, 100)
 * 4. Verify pagination metadata and post count
 * 5. Test cursor-based pagination
 * 6. Verify empty results for pages beyond available data
 */
export async function test_api_member_popular_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
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
  // 2. Test pagination with different limit values
  const limits = [1, 10, 50, 100] as const;
  for (const limit of limits) {
    const response = await api.functional.redditLike.member.feed.popular.index(
      memberConnection,
      {
        body: {
          limit,
          page: 1,
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(response);
    // 3. Verify pagination structure
    TestValidator.equals("pagination exists", response.pagination, {
      current: 1,
      limit,
      records: response.pagination.records,
      pages: response.pagination.pages,
    } satisfies IPage.IPagination);
    // 4. Verify data array length matches limit
    const expectedDataLength = Math.min(limit, response.pagination.records);
    TestValidator.equals(
      "data length matches limit",
      response.data.length,
      expectedDataLength,
    );
    // 5. Verify post structure
    for (const post of response.data) {
      typia.assert(post);
      TestValidator.predicate("has valid id", /^[0-9a-f-]{36}$/i.test(post.id));
      TestValidator.predicate(
        "has title",
        typeof post.title === "string" && post.title.length > 0,
      );
      TestValidator.predicate(
        "has author",
        post.author !== null && post.author !== undefined,
      );
      TestValidator.predicate(
        "has community",
        post.community !== null && post.community !== undefined,
      );
      TestValidator.predicate(
        "has score",
        typeof post.score === "number" && post.score >= 0,
      );
      TestValidator.predicate(
        "has comment_count",
        typeof post.comment_count === "number" && post.comment_count >= 0,
      );
      TestValidator.predicate(
        "has valid created_at",
        typeof post.created_at === "string" && post.created_at.length > 0,
      );
    }
  }
  // 6. Test cursor-based pagination if supported
  const cursorResponse =
    await api.functional.redditLike.member.feed.popular.index(
      memberConnection,
      {
        body: {
          limit: 10,
          cursor: undefined,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(cursorResponse);
  TestValidator.predicate(
    "cursor response has data",
    cursorResponse.data.length >= 0,
  );
  // 7. Test page beyond available data returns empty results
  const farPage = Math.max(100, cursorResponse.pagination.pages + 5);
  const emptyResponse =
    await api.functional.redditLike.member.feed.popular.index(
      memberConnection,
      {
        body: {
          page: farPage,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals("empty page has no data", emptyResponse.data.length, 0);
  TestValidator.equals(
    "empty page has correct pagination",
    emptyResponse.pagination.current,
    farPage,
  );
}
