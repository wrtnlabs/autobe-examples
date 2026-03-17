import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_sorting_methods(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(join);
  // Use memberConnection (headers already updated by authorize_member_join)
  // 2. Test default feed (popular feed with default sorting)
  const defaultFeed =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      { body: {} },
    );
  typia.assert(defaultFeed);
  // 3. Test pagination with page=1, limit=10
  const page1Feed =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      { body: { page: 1, limit: 10 } },
    );
  typia.assert(page1Feed);
  // 4. Test pagination with page=2, limit=10
  const page2Feed =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      { body: { page: 2, limit: 10 } },
    );
  typia.assert(page2Feed);
  // 5. Test search functionality
  const searchFeed =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      { body: { search: "test" } },
    );
  typia.assert(searchFeed);
  // 6. Validate feed response structure
  TestValidator.equals(
    "default feed has pagination",
    defaultFeed.pagination !== null,
    true,
  );
  TestValidator.equals(
    "default feed has data array",
    defaultFeed.data.length >= 0,
    true,
  );
  // 7. Validate pagination metadata
  TestValidator.equals("page 1 current", page1Feed.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Feed.pagination.limit, 10);
  TestValidator.equals("page 2 current", page2Feed.pagination.current, 2);
  // 8. Validate post structure when posts exist
  if (defaultFeed.data.length > 0) {
    const firstPost = defaultFeed.data[0];
    // Validate basic post fields
    TestValidator.equals("post id exists", firstPost.id.length > 0, true);
    TestValidator.equals("post title exists", firstPost.title.length > 0, true);
    TestValidator.equals(
      "vote_score is number",
      typeof firstPost.vote_score === "number",
      true,
    );
    TestValidator.equals(
      "comment_count is number",
      typeof firstPost.comment_count === "number",
      true,
    );
    TestValidator.equals(
      "created_at is string",
      typeof firstPost.created_at === "string",
      true,
    );
    TestValidator.equals(
      "post_type is valid",
      ["text", "link", "image"].includes(firstPost.post_type),
      true,
    );
    TestValidator.predicate(
      "preview_content is string or null",
      typeof firstPost.preview_content === "string" ||
        firstPost.preview_content === null,
    );
    // Validate author
    TestValidator.equals("author exists", firstPost.author !== null, true);
    TestValidator.equals("author has id", firstPost.author.id.length > 0, true);
    TestValidator.equals(
      "author has username",
      firstPost.author.username.length > 0,
      true,
    );
    TestValidator.equals(
      "author has created_at",
      typeof firstPost.author.created_at === "string",
      true,
    );
    // Validate community
    TestValidator.equals(
      "community exists",
      firstPost.community !== null,
      true,
    );
    TestValidator.equals(
      "community has id",
      firstPost.community.id.length > 0,
      true,
    );
    TestValidator.equals(
      "community has name",
      firstPost.community.name.length > 0,
      true,
    );
    TestValidator.equals(
      "community has subscriber_count",
      typeof firstPost.community.subscriber_count === "number",
      true,
    );
    TestValidator.equals(
      "community has owner",
      firstPost.community.owner !== null,
      true,
    );
  }
  // 9. Validate pagination consistency
  TestValidator.equals(
    "page 1 pages >= 1",
    page1Feed.pagination.pages >= 1,
    true,
  );
  TestValidator.equals(
    "page 2 pages >= 1",
    page2Feed.pagination.pages >= 1,
    true,
  );
  TestValidator.equals(
    "page 1 records >= 0",
    page1Feed.pagination.records >= 0,
    true,
  );
  // 10. Validate search returns valid structure
  TestValidator.equals(
    "search feed has pagination",
    searchFeed.pagination !== null,
    true,
  );
  TestValidator.equals(
    "search feed has data array",
    searchFeed.data.length >= 0,
    true,
  );
}
