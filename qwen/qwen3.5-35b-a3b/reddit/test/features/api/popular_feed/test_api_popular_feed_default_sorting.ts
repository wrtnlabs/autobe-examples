import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_default_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Login as the member
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: joinResponse.email,
      password: "TestPass123!",
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Make PATCH request to popular feed with minimal/empty request body
  const feedConnection: api.IConnection = { host: connection.host };
  const feedResponse =
    await api.functional.redditCommunity.member.feeds.popular.index(
      feedConnection,
      {
        body: {} satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(feedResponse);
  // 4. Verify pagination metadata
  TestValidator.equals("current page", feedResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is valid",
    feedResponse.pagination.limit >= 1 && feedResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records is non-negative",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is valid",
    feedResponse.pagination.pages === 0 ||
      feedResponse.pagination.pages ===
        Math.ceil(
          feedResponse.pagination.records / feedResponse.pagination.limit,
        ),
  );
  // 5. Verify each post summary includes required fields
  for (const post of feedResponse.data) {
    typia.assert(post);
    // Verify basic post fields
    TestValidator.equals("post has valid id", post.id !== undefined, true);
    TestValidator.equals(
      "post has title",
      post.title !== undefined && post.title.length > 0,
      true,
    );
    TestValidator.predicate(
      "post has valid post_type",
      ["text", "link", "image"].includes(post.post_type),
    );
    TestValidator.predicate(
      "vote score is integer",
      Number.isInteger(post.vote_score),
    );
    TestValidator.predicate(
      "comment count is non-negative",
      post.comment_count >= 0,
    );
    TestValidator.equals(
      "created_at is valid datetime string",
      typeof post.created_at === "string",
      true,
    );
    TestValidator.equals(
      "updated_at is valid datetime string",
      typeof post.updated_at === "string",
      true,
    );
    TestValidator.equals(
      "deleted_at is null (not soft-deleted)",
      post.deleted_at,
      null,
    );
    // Verify author fields
    typia.assert(post.author);
    TestValidator.equals(
      "author has valid id",
      post.author.id !== undefined,
      true,
    );
    TestValidator.equals(
      "author has username",
      post.author.username !== undefined && post.author.username.length > 0,
      true,
    );
    TestValidator.equals(
      "author created_at is valid datetime string",
      typeof post.author.created_at === "string",
      true,
    );
    TestValidator.equals(
      "author updated_at is valid datetime string",
      typeof post.author.updated_at === "string",
      true,
    );
    // Verify community fields
    typia.assert(post.community);
    TestValidator.equals(
      "community has valid id",
      post.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      post.community.name !== undefined && post.community.name.length > 0,
      true,
    );
    TestValidator.equals(
      "community created_at is valid datetime string",
      typeof post.community.created_at === "string",
      true,
    );
  }
  // 6. Verify posts come from multiple communities (if there are posts)
  if (feedResponse.data.length > 1) {
    const communityIds = ArrayUtil.repeat(
      feedResponse.data.length,
      (i) => feedResponse.data[i].community.id,
    );
    const uniqueCommunityIds = new Set(communityIds);
    TestValidator.predicate(
      "posts are from multiple communities",
      uniqueCommunityIds.size > 1,
    );
  }
  // 7. Verify soft-deleted posts are excluded (all posts have deleted_at = null)
  const deletedPosts = feedResponse.data.filter(
    (post) => post.deleted_at !== null,
  );
  TestValidator.equals("no soft-deleted posts", deletedPosts.length, 0);
}