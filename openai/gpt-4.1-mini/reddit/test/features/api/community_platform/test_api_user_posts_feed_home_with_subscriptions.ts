import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_posts_feed_home_with_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {}, // ICommunityPlatformUser.IJoin is an empty type
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Retrieve home feed posts for the authenticated user
  const feed =
    await api.functional.communityPlatform.user.posts.feed.home.index(
      userConnection,
    );
  // 3. Validate response type and structure
  typia.assert(feed);
  // 4. Confirm pagination metadata coherence
  TestValidator.predicate(
    "pagination current page is at least 1",
    feed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    feed.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    feed.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    feed.pagination.records >= 0,
  );
  // 5. Validate each post summary
  for (const post_ of feed.data) {
    const post = typia.assert<any>(post_);
    // typia.assert(post); // Already validated by typia.assert(feed)
    // Validate essential expected summary properties:
    TestValidator.predicate(
      "post title exists",
      typeof post.title === "string" && post.title.length > 0,
    );
    TestValidator.predicate(
      "author username exists",
      typeof post.author_username === "string" &&
        post.author_username.length > 0,
    );
    TestValidator.predicate(
      "community name exists",
      typeof post.community_name === "string" && post.community_name.length > 0,
    );
    // Validate vote score is a number (can be negative)
    TestValidator.predicate(
      "vote score is number",
      typeof post.vote_score === "number" && Number.isInteger(post.vote_score),
    );
    // Validate comment count is non-negative integer
    TestValidator.predicate(
      "comment count is non-negative integer",
      typeof post.comment_count === "number" &&
        post.comment_count >= 0 &&
        Number.isInteger(post.comment_count),
    );
    // Validate time_since_posted is a string
    TestValidator.predicate(
      "time since posted is string",
      typeof post.time_since_posted === "string" &&
        post.time_since_posted.length > 0,
    );
  }
}
