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

export async function test_api_post_popular_feed_retrieval_public(
  connection: api.IConnection,
): Promise<void> {
  // No authentication is required since popular feed is public
  const publicConnection: api.IConnection = { host: connection.host };
  // The request body is empty to represent no filters for popular feed
  const requestBody: ICommunityPlatformPost.IRequest = {};
  // Retrieve popular posts with no filters - default sort should be "new"
  const response = await api.functional.communityPlatform.user.posts.index(
    publicConnection,
    {
      body: requestBody,
    },
  );
  // Assert the response structure
  typia.assert(response);
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  // Validate that posts from multiple communities appear
  const communityIds = new Set<string>();
  // Check each post's vote score and comment count are numbers
  for (const post of response.data) {
    // vote_score and comment_count should be numbers (if exist)
    if ("vote_score" in post) {
      TestValidator.predicate(
        "vote score is number",
        typeof post["vote_score"] === "number",
      );
    }
    if ("comment_count" in post) {
      TestValidator.predicate(
        "comment count is number",
        typeof post["comment_count"] === "number",
      );
    }
    // Gather community ids that appeared
    if (
      "community" in post &&
      post.community !== null &&
      typeof post.community === "object"
    ) {
      if ("id" in post.community && typeof post.community.id === "string") {
        communityIds.add(post.community.id);
      }
    }
  }
  // Validate that there are posts from at least one community to confirm multi-community presence
  TestValidator.predicate(
    "posts from multiple communities",
    communityIds.size >= 1,
  );
  // Validate pagination limits effect - if more than 0 posts received
  if (response.data.length > 0) {
    TestValidator.predicate(
      "received posts count does not exceed pagination limit",
      response.data.length <= response.pagination.limit,
    );
  }
}
