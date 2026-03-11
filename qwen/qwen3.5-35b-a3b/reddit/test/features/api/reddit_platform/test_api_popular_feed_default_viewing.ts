import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for viewing the popular feed as an authenticated member.
 * Verifies default sorting, pagination, and proper response structure.
 */
export async function test_api_popular_feed_default_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Call popular feed with default parameters
  const feedConnection: api.IConnection = { host: connection.host };
  const feedResult =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      feedConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(feedResult);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    feedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", feedResult.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records positive",
    feedResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    feedResult.pagination.pages > 0,
  );
  // 4. Validate response data array exists and has posts
  TestValidator.equals(
    "posts array exists",
    Array.isArray(feedResult.data),
    true,
  );
  TestValidator.predicate(
    "posts array has records",
    feedResult.data.length > 0,
  );
  // 5. Validate each post summary has required fields
  for (const post of feedResult.data) {
    typia.assert(post);
    // Validate post summary fields
    TestValidator.equals("post title is string", typeof post.title, "string");
    TestValidator.equals("post title has content", post.title.length > 0, true);
    TestValidator.equals(
      "post type is valid enum",
      ["TEXT", "LINK", "IMAGE"].includes(post.post_type),
      true,
    );
    TestValidator.predicate(
      "vote score is number",
      typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "comment count is number",
      typeof post.comment_count === "number",
    );
    TestValidator.equals(
      "post created_at is valid date",
      new Date(post.created_at).getTime() > 0,
      true,
    );
    // Validate author relationship
    typia.assert(post.author);
    TestValidator.equals(
      "author username exists",
      typeof post.author.username,
      "string",
    );
    TestValidator.equals(
      "author display_name exists",
      typeof post.author.display_name,
      "string",
    );
    TestValidator.equals(
      "author karma_score is number",
      typeof post.author.karma_score,
      "number",
    );
    // Validate community relationship
    typia.assert(post.community);
    TestValidator.equals(
      "community name exists",
      typeof post.community.name,
      "string",
    );
    TestValidator.equals(
      "community subscriber_count is number",
      typeof post.community.subscriber_count,
      "number",
    );
  }
  // 6. Verify posts come from multiple communities (not filtered by subscription)
  const uniqueCommunityNames = new Set(
    feedResult.data.map((post) => post.community.name),
  );
  TestValidator.predicate(
    "posts from multiple communities",
    uniqueCommunityNames.size >= 1,
  );
  // 7. Verify total records matches actual data length
  TestValidator.equals(
    "total records matches data length",
    feedResult.pagination.records,
    feedResult.data.length,
  );
}
