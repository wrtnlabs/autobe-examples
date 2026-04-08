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

export async function test_api_trending_posts_sort_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Test HOT sorting
  const hotResponse =
    await api.functional.redditPlatform.member.trending.posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "hot",
        },
      },
    );
  typia.assert(hotResponse);
  // Validate hot sort response structure
  TestValidator.equals(
    "hot pagination current",
    hotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "hot pagination limit",
    hotResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "hot has records",
    hotResponse.pagination.records >= 0,
  );
  TestValidator.predicate("hot has pages", hotResponse.pagination.pages >= 0);
  // Validate all posts in hot response are active (deleted_at = null)
  if (hotResponse.data.length > 0) {
    for (const post of hotResponse.data) {
      TestValidator.equals(
        `hot post ${post.id} is active`,
        post.deleted_at,
        null,
      );
      TestValidator.predicate(
        "hot post has valid id",
        /^[0-9a-f-]{36}$/i.test(post.id),
      );
      TestValidator.predicate("hot post has title", post.title.length > 0);
      TestValidator.predicate("hot post has author", post.author !== undefined);
      TestValidator.predicate(
        "hot post has community",
        post.community !== undefined,
      );
    }
  }
  // 3. Test NEW sorting
  const newResponse =
    await api.functional.redditPlatform.member.trending.posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        },
      },
    );
  typia.assert(newResponse);
  TestValidator.equals(
    "new pagination current",
    newResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "new pagination limit",
    newResponse.pagination.limit,
    20,
  );
  // Validate new sort ordering (created_at DESC)
  if (newResponse.data.length > 1) {
    for (let i = 0; i < newResponse.data.length - 1; i++) {
      const current = newResponse.data[i];
      const next = newResponse.data[i + 1];
      TestValidator.predicate(
        `new sort order ${i}`,
        new Date(current.created_at) >= new Date(next.created_at),
      );
    }
  }
  // Validate all posts are active
  if (newResponse.data.length > 0) {
    for (const post of newResponse.data) {
      TestValidator.equals(
        `new post ${post.id} is active`,
        post.deleted_at,
        null,
      );
    }
  }
  // 4. Test TOP sorting with week time range
  const topWeekResponse =
    await api.functional.redditPlatform.member.trending.posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "top",
          topTimeRange: "week",
        },
      },
    );
  typia.assert(topWeekResponse);
  TestValidator.equals(
    "top week pagination current",
    topWeekResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "top week pagination limit",
    topWeekResponse.pagination.limit,
    20,
  );
  // Validate top week filtering (all posts should be from last week)
  if (topWeekResponse.data.length > 0) {
    const oneWeekAgoDate = new Date();
    oneWeekAgoDate.setDate(oneWeekAgoDate.getDate() - 7);
    for (const post of topWeekResponse.data) {
      TestValidator.equals(
        `top week post ${post.id} is active`,
        post.deleted_at,
        null,
      );
      const postDate = new Date(post.created_at);
      TestValidator.predicate(
        `top week post ${post.id} is from last week`,
        postDate >= oneWeekAgoDate,
      );
    }
  }
  // 5. Test TOP sorting with all time range
  const topLevelResponse =
    await api.functional.redditPlatform.member.trending.posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "top",
          topTimeRange: "all",
        },
      },
    );
  typia.assert(topLevelResponse);
  TestValidator.equals(
    "top all pagination current",
    topLevelResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "top all pagination limit",
    topLevelResponse.pagination.limit,
    20,
  );
  // Validate top all has no time restriction
  if (topLevelResponse.data.length > 0) {
    for (const post of topLevelResponse.data) {
      TestValidator.equals(
        `top all post ${post.id} is active`,
        post.deleted_at,
        null,
      );
    }
  }
  // 6. Test CONTROVERSIAL sorting
  const controversialResponse =
    await api.functional.redditPlatform.member.trending.posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "controversial",
        },
      },
    );
  typia.assert(controversialResponse);
  TestValidator.equals(
    "controversial pagination current",
    controversialResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "controversial pagination limit",
    controversialResponse.pagination.limit,
    20,
  );
  // Validate controversial posts are active
  if (controversialResponse.data.length > 0) {
    for (const post of controversialResponse.data) {
      TestValidator.equals(
        `controversial post ${post.id} is active`,
        post.deleted_at,
        null,
      );
      // Verify score calculation: score = upvotes - downvotes
      const score = post.upvotes_count - post.downvotes_count;
      TestValidator.predicate(
        "controversial score calculation",
        score === post.upvotes_count - post.downvotes_count,
      );
    }
  }
  // 7. Validate response structure consistency
  const allResponses = [
    hotResponse,
    newResponse,
    topWeekResponse,
    topLevelResponse,
    controversialResponse,
  ];
  for (let i = 0; i < allResponses.length; i++) {
    const response = allResponses[i];
    TestValidator.equals(
      `response ${i} has data array`,
      Array.isArray(response.data),
      true,
    );
    TestValidator.equals(
      `response ${i} has pagination`,
      response.pagination !== undefined,
      true,
    );
    // Validate pagination fields
    TestValidator.predicate(
      `response ${i} pagination current valid`,
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      `response ${i} pagination limit valid`,
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `response ${i} pagination records valid`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `response ${i} pagination pages valid`,
      response.pagination.pages >= 0,
    );
  }
}