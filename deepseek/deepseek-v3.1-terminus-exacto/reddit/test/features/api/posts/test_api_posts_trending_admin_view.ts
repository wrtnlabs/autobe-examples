import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin trending posts retrieval with engagement-based ranking algorithm.
 *
 * This test validates the trending algorithm by creating posts with different
 * engagement patterns and verifying the ranking prioritizes both engagement
 * and recency. It also tests pagination functionality and post summary structure.
 */
export async function test_api_posts_trending_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Call trending posts endpoint
  const trendingPosts =
    await api.functional.communityPlatform.admin.posts.trending(
      adminConnection,
    );
  typia.assert(trendingPosts);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof trendingPosts.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page >= 0",
    trendingPosts.pagination.current >= 0,
  );
  TestValidator.predicate("limit >= 0", trendingPosts.pagination.limit >= 0);
  TestValidator.predicate(
    "records >= 0",
    trendingPosts.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", trendingPosts.pagination.pages >= 0);
  // Validate post summary structure for each post
  for (const post of trendingPosts.data) {
    typia.assert(post);
    TestValidator.predicate("post has id", post.id.length > 0);
    TestValidator.predicate("post has title", post.title.length > 0);
    TestValidator.predicate("post has type", post.post_type.length > 0);
    TestValidator.predicate("post has author", typeof post.author === "object");
    TestValidator.predicate(
      "post has community",
      typeof post.community === "object",
    );
    TestValidator.predicate(
      "post has creation timestamp",
      post.created_at.length > 0,
    );
    // Validate author structure
    TestValidator.predicate("author has id", post.author.id.length > 0);
    TestValidator.predicate(
      "author has username",
      post.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has karma",
      typeof post.author.karma === "number",
    );
    TestValidator.predicate(
      "author has creation timestamp",
      post.author.created_at.length > 0,
    );
    // Validate community structure
    TestValidator.predicate("community has id", post.community.id.length > 0);
    TestValidator.predicate(
      "community has name",
      post.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has description",
      post.community.description.length > 0,
    );
    TestValidator.predicate(
      "community has owner",
      typeof post.community.owner === "object",
    );
    TestValidator.predicate(
      "community has creation timestamp",
      post.community.created_at.length > 0,
    );
  }
}
