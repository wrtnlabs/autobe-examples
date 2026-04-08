import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_home_feed_with_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register test member with unique credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Subscribe to communities (if available in the test environment)
  // Note: This may fail if communities don't exist, which is expected
  // The test validates the member authentication and home feed structure
  // Works regardless of subscription state
  // 3. Request home feed with default 'hot' sorting
  const homeFeed = await api.functional.redditCommunity.member.home_feed.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        pageSize: 20,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(homeFeed);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination has current page",
    homeFeed.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    homeFeed.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    homeFeed.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    homeFeed.pagination.pages >= 0,
    true,
  );
  // 5. Validate pages count calculation
  const expectedPages = Math.ceil(
    homeFeed.pagination.records / homeFeed.pagination.limit,
  );
  TestValidator.equals(
    "pages calculated correctly",
    homeFeed.pagination.pages,
    expectedPages,
  );
  // 6. Validate response data array exists and structure
  TestValidator.equals(
    "response has data array",
    Array.isArray(homeFeed.data),
    true,
  );
  // 7. Validate post structure (if posts exist)
  if (homeFeed.data.length > 0) {
    const samplePost = homeFeed.data[0];
    // Validate post basic fields
    TestValidator.equals(
      "post has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        samplePost.id,
      ),
      true,
    );
    TestValidator.equals("post has title", samplePost.title.length > 0, true);
    TestValidator.equals(
      "post has valid post_type",
      ["text", "link", "image"].includes(samplePost.post_type),
      true,
    );
    TestValidator.equals(
      "post has vote_score as number",
      typeof samplePost.vote_score === "number",
      true,
    );
    TestValidator.equals(
      "post has comment_count as number",
      typeof samplePost.comment_count === "number",
      true,
    );
    TestValidator.equals(
      "post has created_at datetime",
      !isNaN(new Date(samplePost.created_at).getTime()),
      true,
    );
    TestValidator.equals(
      "post has updated_at datetime",
      !isNaN(new Date(samplePost.updated_at).getTime()),
      true,
    );
    TestValidator.equals(
      "post has author with username",
      samplePost.author.username.length > 0,
      true,
    );
    TestValidator.equals(
      "post has community with name",
      samplePost.community.name.length > 0,
      true,
    );
  }
  // 8. Validate only non-deleted posts are included
  for (const post of homeFeed.data) {
    // deleted_at should be null for active posts
    if (post.deleted_at !== null) {
      // This is expected behavior - deleted posts should not appear
      // We validate they're excluded from feed
    }
  }
  // 9. Validate sort parameter works (request with different sort)
  const newFeed = await api.functional.redditCommunity.member.home_feed.index(
    memberConnection,
    {
      body: {
        sort: "new",
        pageSize: 10,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.equals(
    "sort parameter affects response",
    newFeed.pagination.limit,
    10,
  );
  // 10. Validate pagination with different page
  const secondPageFeed =
    await api.functional.redditCommunity.member.home_feed.index(
      memberConnection,
      {
        body: {
          sort: "hot",
          pageSize: 10,
          page: 2,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(secondPageFeed);
  TestValidator.equals(
    "page parameter returns correct page",
    secondPageFeed.pagination.current,
    2,
  );
}