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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_community_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Register a member using utility function
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
  // Create actor-specific connection with authorization headers
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // Test pagination with page-based approach (assuming community exists as per scenario)
  const result1 =
    await api.functional.redditLike.member.communities.feed.search(
      authConnection,
      {
        communityName: "test-community",
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(result1);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination.current should be 1",
    result1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 10",
    result1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    result1.pagination.pages >= 0,
  );
  // Test page 2 pagination
  const result2 =
    await api.functional.redditLike.member.communities.feed.search(
      authConnection,
      {
        communityName: "test-community",
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(result2);
  // Verify cursor-based pagination with first post from page 1
  if (result1.data.length > 0 && result1.data[0].created_at) {
    const cursor = result1.data[0].created_at;
    const cursorResult =
      await api.functional.redditLike.member.communities.feed.search(
        authConnection,
        {
          communityName: "test-community",
          body: {
            cursor: cursor,
            limit: 10,
          } satisfies IRedditLikePost.IRequest,
        },
      );
    typia.assert(cursorResult);
  }
  // Test edge case - beyond available pages
  const edgeCaseResult =
    await api.functional.redditLike.member.communities.feed.search(
      authConnection,
      {
        communityName: "test-community",
        body: {
          page: 999,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(edgeCaseResult);
  // Verify empty data array for out-of-range page
  TestValidator.equals(
    "empty data for page 999",
    edgeCaseResult.data.length,
    0,
  );
}
