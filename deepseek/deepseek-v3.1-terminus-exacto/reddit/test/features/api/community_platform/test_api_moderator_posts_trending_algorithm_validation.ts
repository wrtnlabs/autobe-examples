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

export async function test_api_moderator_posts_trending_algorithm_validation(
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
  // Query trending posts to get current trending content
  const trendingResponse =
    await api.functional.communityPlatform.moderator.posts.trending(
      moderatorConnection,
    );
  typia.assert(trendingResponse);
  // Validate response structure
  TestValidator.equals(
    "response has pagination",
    typeof trendingResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(trendingResponse.data),
    true,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    trendingResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    trendingResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    trendingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    trendingResponse.pagination.pages >= 0,
  );
  // Validate post structure if posts exist
  if (trendingResponse.data.length > 0) {
    const firstPost = trendingResponse.data[0];
    TestValidator.equals("post has id", typeof firstPost.id, "string");
    TestValidator.equals("post has title", typeof firstPost.title, "string");
    TestValidator.equals(
      "post has post_type",
      typeof firstPost.post_type,
      "string",
    );
    TestValidator.equals("post has author", typeof firstPost.author, "object");
    TestValidator.equals(
      "post has community",
      typeof firstPost.community,
      "object",
    );
    TestValidator.equals(
      "post has votes_count",
      typeof firstPost.votes_count,
      "number",
    );
    TestValidator.equals(
      "post has comments_count",
      typeof firstPost.comments_count,
      "number",
    );
    TestValidator.equals(
      "post has created_at",
      typeof firstPost.created_at,
      "string",
    );
    TestValidator.equals(
      "post has updated_at",
      typeof firstPost.updated_at,
      "string",
    );
    TestValidator.equals(
      "post has deleted_at",
      firstPost.deleted_at === null || typeof firstPost.deleted_at === "string",
      true,
    );
    // Validate author summary structure
    TestValidator.equals("author has id", typeof firstPost.author.id, "string");
    TestValidator.equals(
      "author has username",
      typeof firstPost.author.username,
      "string",
    );
    TestValidator.equals(
      "author has display_name",
      firstPost.author.display_name === null ||
        typeof firstPost.author.display_name === "string",
      true,
    );
    TestValidator.equals(
      "author has avatar_url",
      firstPost.author.avatar_url === null ||
        typeof firstPost.author.avatar_url === "string",
      true,
    );
    TestValidator.equals(
      "author has karma",
      typeof firstPost.author.karma,
      "number",
    );
    TestValidator.equals(
      "author has created_at",
      typeof firstPost.author.created_at,
      "string",
    );
    // Validate community summary structure
    TestValidator.equals(
      "community has id",
      typeof firstPost.community.id,
      "string",
    );
    TestValidator.equals(
      "community has name",
      typeof firstPost.community.name,
      "string",
    );
    TestValidator.equals(
      "community has description",
      typeof firstPost.community.description,
      "string",
    );
    TestValidator.equals(
      "community has icon_url",
      firstPost.community.icon_url === null ||
        typeof firstPost.community.icon_url === "string",
      true,
    );
    TestValidator.equals(
      "community has owner",
      typeof firstPost.community.owner,
      "object",
    );
    TestValidator.equals(
      "community has created_at",
      typeof firstPost.community.created_at,
      "string",
    );
    // Validate community owner structure
    TestValidator.equals(
      "community owner has id",
      typeof firstPost.community.owner.id,
      "string",
    );
    TestValidator.equals(
      "community owner has username",
      typeof firstPost.community.owner.username,
      "string",
    );
    TestValidator.equals(
      "community owner has display_name",
      firstPost.community.owner.display_name === null ||
        typeof firstPost.community.owner.display_name === "string",
      true,
    );
    TestValidator.equals(
      "community owner has avatar_url",
      firstPost.community.owner.avatar_url === null ||
        typeof firstPost.community.owner.avatar_url === "string",
      true,
    );
    TestValidator.equals(
      "community owner has karma",
      typeof firstPost.community.owner.karma,
      "number",
    );
    TestValidator.equals(
      "community owner has created_at",
      typeof firstPost.community.owner.created_at,
      "string",
    );
  }
  // Verify soft-deleted posts are excluded
  const hasDeletedPosts = trendingResponse.data.some(
    (post) => post.deleted_at !== null,
  );
  TestValidator.equals(
    "soft-deleted posts are excluded",
    hasDeletedPosts,
    false,
  );
  // Note: The trending algorithm validation requires creating posts with specific engagement patterns
  // and then verifying the ranking order. However, the current API doesn't provide endpoints
  // for creating posts, votes, and comments programmatically. This test validates the basic
  // functionality and structure of the trending endpoint.
}
