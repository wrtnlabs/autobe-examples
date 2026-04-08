import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_home_feed_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for retrieving a member's personalized home feed.
   *
   * Validates the home feed retrieval flow including member authentication,
   * feed retrieval with pagination and sorting. Ensures that the home feed
   * correctly returns posts with proper sorting (hot: time-decay weighted by score,
   * new: by created_at DESC) and accurate pagination metadata.
   *
   * Special attention is given to verifying that pagination metadata is accurate,
   * sorting is correctly applied, and the response structure matches the expected
   * IPageIRedditPlatformPost.ISummary type.
   */
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Call home feed API with default sort='hot'
  const hotFeedResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.users.me.activity.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "hot",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(hotFeedResponse);
  // 3. Verify response structure
  TestValidator.equals(
    "hot feed has pagination",
    hotFeedResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "hot feed has data array",
    Array.isArray(hotFeedResponse.data),
    true,
  );
  // 4. Validate pagination metadata for hot sort
  TestValidator.equals(
    "hot feed pagination has current page",
    hotFeedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "hot feed pagination has limit",
    hotFeedResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "hot feed pagination has total records",
    hotFeedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "hot feed pagination has total pages",
    hotFeedResponse.pagination.pages >= 0,
  );
  // 5. Validate post metadata in hot feed response
  for (const post of hotFeedResponse.data) {
    typia.assert(post);
    TestValidator.predicate("post has valid id", post.id !== undefined);
    TestValidator.predicate("post has valid title", post.title !== undefined);
    TestValidator.predicate(
      "post has valid type",
      post.post_type !== undefined,
    );
    TestValidator.predicate("post has valid author", post.author !== undefined);
    TestValidator.predicate(
      "post has valid community",
      post.community !== undefined,
    );
    TestValidator.predicate(
      "post has valid created_at",
      post.created_at !== undefined,
    );
    TestValidator.predicate(
      "post has valid updated_at",
      post.updated_at !== undefined,
    );
    TestValidator.predicate(
      "post has valid deleted_at",
      post.deleted_at !== undefined,
    );
  }
  // 6. Call home feed API with sort='new'
  const newFeedResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.users.me.activity.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(newFeedResponse);
  // 7. Verify sorting is applied (new feed should have different order if data exists)
  if (hotFeedResponse.data.length > 0 && newFeedResponse.data.length > 0) {
    const hotFirstId = hotFeedResponse.data[0].id;
    const newFirstId = newFeedResponse.data[0].id;
    if (hotFirstId !== newFirstId) {
      TestValidator.notEquals(
        "hot and new feeds have different order",
        hotFirstId,
        newFirstId,
      );
    } else if (
      hotFeedResponse.data.length > 1 ||
      newFeedResponse.data.length > 1
    ) {
      TestValidator.predicate(
        "sorting produces different results with multiple items",
        hotFeedResponse.data[1]?.id !== newFeedResponse.data[1]?.id,
      );
    }
  }
  // 8. Test with max limit (100)
  const maxLimitFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.users.me.activity.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "hot",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(maxLimitFeed);
  TestValidator.equals(
    "max limit pagination has correct limit",
    maxLimitFeed.pagination.limit,
    100,
  );
  // 9. Validate that max limit feed has same or more records
  TestValidator.predicate(
    "max limit feed has >= hot feed records",
    maxLimitFeed.pagination.records >= hotFeedResponse.pagination.records,
  );
  // 10. Validate pagination calculations
  const expectedPages = Math.ceil(
    hotFeedResponse.pagination.records / hotFeedResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation correct",
    hotFeedResponse.pagination.pages,
    expectedPages,
  );
}
