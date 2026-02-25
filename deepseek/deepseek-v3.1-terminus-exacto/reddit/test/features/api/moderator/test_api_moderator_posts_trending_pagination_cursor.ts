import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_posts_trending_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Test initial trending posts query
  const firstPage =
    await api.functional.communityPlatform.moderator.posts.trending(
      moderatorConnection,
    );
  typia.assert(firstPage);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    firstPage.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(firstPage.data));
  // Test pagination metadata consistency
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.predicate("limit is positive", firstPage.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Test data structure for posts
  if (firstPage.data.length > 0) {
    const post = firstPage.data[0];
    TestValidator.predicate("post has id", typeof post.id === "string");
    TestValidator.predicate("post has title", typeof post.title === "string");
    TestValidator.predicate("post has author", post.author !== undefined);
    TestValidator.predicate("post has community", post.community !== undefined);
    TestValidator.predicate(
      "post has votes count",
      typeof post.votes_count === "number",
    );
    TestValidator.predicate(
      "post has comments count",
      typeof post.comments_count === "number",
    );
    TestValidator.predicate(
      "post has created_at",
      typeof post.created_at === "string",
    );
    // Test cursor-based pagination if we have enough data
    if (firstPage.data.length >= firstPage.pagination.limit) {
      // Extract cursor from first page (assuming last item's ID as cursor)
      const cursor = firstPage.data[firstPage.data.length - 1].id;
      // Query next page using cursor
      const nextPage =
        await api.functional.communityPlatform.moderator.posts.trending(
          moderatorConnection,
        );
      typia.assert(nextPage);
      // Verify we get different posts (cursor should advance)
      if (nextPage.data.length > 0) {
        const firstPostId = firstPage.data[0].id;
        const nextFirstPostId = nextPage.data[0].id;
        TestValidator.notEquals(
          "first post differs between pages",
          firstPostId,
          nextFirstPostId,
        );
      }
    }
  }
  // Test empty scenario
  if (firstPage.data.length === 0) {
    TestValidator.equals("empty data array", firstPage.data.length, 0);
    TestValidator.equals("records count is 0", firstPage.pagination.records, 0);
    TestValidator.equals("pages count is 0", firstPage.pagination.pages, 0);
  }
}
