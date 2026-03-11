import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostEngagementStat";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_posts_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Call analytics endpoint with minimal request body (no filters)
  const analyticsResponse =
    await api.functional.redditPlatform.admin.analytics.posts.index(
      adminConnection,
      {
        body: typia.random<IRedditPlatformPostEngagementStat.IRequest>(),
      },
    );
  typia.assert(analyticsResponse);
  // 3. Validate response has pagination and data array
  TestValidator.equals(
    "response has pagination",
    analyticsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(analyticsResponse.data),
    true,
  );
  // 4. Validate pagination metadata structure and values
  const pagination = analyticsResponse.pagination;
  typia.assert(pagination);
  TestValidator.equals(
    "pagination current is non-negative",
    pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is non-negative",
    pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    pagination.pages >= 0,
    true,
  );
  // 5. Validate data array matches pagination records
  TestValidator.equals(
    "data array length matches pagination records",
    analyticsResponse.data.length,
    pagination.records,
  );
  // 6. Validate engagement stat records if data exists
  if (analyticsResponse.data.length > 0) {
    const engagement = analyticsResponse.data[0];
    typia.assert(engagement);
    // Validate engagement stat fields
    TestValidator.equals(
      "engagement has id",
      engagement.id !== undefined,
      true,
    );
    TestValidator.equals(
      "engagement has view_count",
      engagement.view_count !== undefined,
      true,
    );
    TestValidator.equals(
      "engagement has upvote_count",
      engagement.upvote_count !== undefined,
      true,
    );
    TestValidator.equals(
      "engagement has downvote_count",
      engagement.downvote_count !== undefined,
      true,
    );
    TestValidator.equals(
      "engagement has last_viewed_at",
      engagement.last_viewed_at !== undefined,
      true,
    );
    TestValidator.equals(
      "engagement has created_at",
      engagement.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "engagement has updated_at",
      engagement.updated_at !== undefined,
      true,
    );
    // Validate nested post object
    TestValidator.equals(
      "engagement has post object",
      engagement.post !== undefined,
      true,
    );
    const post = engagement.post;
    typia.assert(post);
    TestValidator.equals("post has id", post.id !== undefined, true);
    TestValidator.equals("post has title", post.title !== undefined, true);
    TestValidator.equals(
      "post has post_type",
      post.post_type !== undefined,
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      post.vote_score !== undefined,
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      post.comment_count !== undefined,
      true,
    );
    TestValidator.equals("post has author", post.author !== undefined, true);
    TestValidator.equals(
      "post has community",
      post.community !== undefined,
      true,
    );
    TestValidator.equals(
      "post has created_at",
      post.created_at !== undefined,
      true,
    );
  }
  // 7. Verify default sorting behavior (by vote_score descending) when at least 2 records exist
  if (analyticsResponse.data.length >= 2) {
    TestValidator.predicate(
      "sorted by vote_score descending (first >= second)",
      analyticsResponse.data[0].post.vote_score >=
        analyticsResponse.data[1].post.vote_score,
    );
  }
  // 8. Validate author and community summary structures exist
  if (analyticsResponse.data.length > 0) {
    const engagement = analyticsResponse.data[0];
    const author = engagement.post.author;
    typia.assert(author);
    TestValidator.equals("author has id", author.id !== undefined, true);
    TestValidator.equals(
      "author has username",
      author.username !== undefined,
      true,
    );
    TestValidator.equals(
      "author has display_name",
      author.display_name !== undefined,
      true,
    );
    TestValidator.equals(
      "author has karma_score",
      author.karma_score !== undefined,
      true,
    );
    TestValidator.equals(
      "author has is_active",
      author.is_active !== undefined,
      true,
    );
    TestValidator.equals(
      "author has created_at",
      author.created_at !== undefined,
      true,
    );
    const community = engagement.post.community;
    typia.assert(community);
    TestValidator.equals("community has id", community.id !== undefined, true);
    TestValidator.equals(
      "community has name",
      community.name !== undefined,
      true,
    );
    TestValidator.equals(
      "community has subscriber_count",
      community.subscriber_count !== undefined,
      true,
    );
    TestValidator.equals(
      "community has created_at",
      community.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "community has owner",
      community.owner !== undefined,
      true,
    );
  }
}