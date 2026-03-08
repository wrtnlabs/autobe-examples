import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedRequest";
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

export async function test_api_feeds_top_success_with_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Request top posts feed with default parameters
  const feedResponse = await api.functional.redditPlatform.feeds.top.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sortType: "TOP" as const,
      } satisfies IRedditPlatformFeedRequest,
    },
  );
  typia.assert(feedResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", feedResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    () => feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    () => feedResponse.pagination.pages >= 0,
  );
  // 4. Validate posts are sorted by vote_score descending
  if (feedResponse.data.length > 1) {
    for (let i = 0; i < feedResponse.data.length - 1; i++) {
      const currentPost = feedResponse.data[i];
      const nextPost = feedResponse.data[i + 1];
      TestValidator.predicate(
        `post ${i} vote_score >= post ${i + 1}`,
        currentPost.vote_score >= nextPost.vote_score,
      );
      // If vote_scores are equal, check created_at descending
      if (currentPost.vote_score === nextPost.vote_score) {
        TestValidator.predicate(
          `post ${i} created_at >= post ${i + 1} (equal scores)`,
          new Date(currentPost.created_at) >= new Date(nextPost.created_at),
        );
      }
    }
  }
  // 5. Validate each post has required fields and structure
  for (const post of feedResponse.data) {
    TestValidator.predicate(
      "post id is string",
      () => typeof post.id === "string",
    );
    TestValidator.predicate(
      "post title is string",
      () => typeof post.title === "string",
    );
    TestValidator.predicate(
      "post type is string",
      () => typeof post.post_type === "string",
    );
    TestValidator.predicate(
      "post vote_score is number",
      () => typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "post comment_count is number",
      () => typeof post.comment_count === "number",
    );
    TestValidator.predicate(
      "post created_at is string",
      () => typeof post.created_at === "string",
    );
    TestValidator.predicate(
      "post deleted_at is null or string",
      () => post.deleted_at === null || typeof post.deleted_at === "string",
    );
    // Validate author structure
    TestValidator.predicate(
      "author id is string",
      () => typeof post.author.id === "string",
    );
    TestValidator.predicate(
      "author username is string",
      () => typeof post.author.username === "string",
    );
    TestValidator.predicate(
      "author display_name is string",
      () => typeof post.author.displayName === "string",
    );
    // Validate community structure
    TestValidator.predicate(
      "community id is string",
      () => typeof post.community.id === "string",
    );
    TestValidator.predicate(
      "community name is string",
      () => typeof post.community.name === "string",
    );
  }
}
