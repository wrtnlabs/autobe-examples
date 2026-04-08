import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function test_api_trending_posts_exclusion_logic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated members (Admin, Test member B, Another member C)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_member_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(adminAuth);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: `membertest_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: `memberanother_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberCAuth);
  // 2. Get trending posts (note: additional setup endpoints not available in SDK)
  // This would normally require: create community, subscribe, create posts, ban, soft-delete
  const trendingConnection: api.IConnection = { host: connection.host };
  const trendingResponse =
    await api.functional.redditPlatform.member.trending.posts.index(
      trendingConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "hot",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(trendingResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination present",
    trendingResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array present",
    Array.isArray(trendingResponse.data),
    true,
  );
  // 4. Validate pagination metadata
  const pagination = trendingResponse.pagination;
  TestValidator.equals("current page", pagination.current, 1);
  TestValidator.predicate("limit positive", pagination.limit > 0);
  TestValidator.predicate("records non-negative", pagination.records >= 0);
  TestValidator.predicate("pages non-negative", pagination.pages >= 0);
  // 5. Validate posts in data array (if any exist)
  if (trendingResponse.data.length > 0) {
    for (const post of trendingResponse.data) {
      typia.assert(post);
      // 6. Verify all posts have deleted_at = null (soft-deleted posts excluded)
      TestValidator.equals("post not soft-deleted", post.deleted_at, null);
      // 7. Validate post structure
      TestValidator.equals(
        "post has UUID id",
        /^[0-9a-f-]{36}$/i.test(post.id),
        true,
      );
      TestValidator.equals(
        "post has title",
        typeof post.title === "string",
        true,
      );
      TestValidator.equals(
        "post has valid post_type",
        ["text", "link", "image"].includes(post.post_type),
        true,
      );
      TestValidator.predicate("post has upvotes", post.upvotes_count >= 0);
      TestValidator.predicate("post has downvotes", post.downvotes_count >= 0);
      TestValidator.predicate(
        "post has comment count",
        post.comment_count >= 0,
      );
      // 8. Validate author structure
      typia.assert(post.author);
      TestValidator.equals(
        "author has UUID id",
        /^[0-9a-f-]{36}$/i.test(post.author.id),
        true,
      );
      TestValidator.equals(
        "author has username",
        typeof post.author.username === "string",
        true,
      );
      TestValidator.predicate(
        "author has non-negative karma",
        post.author.karma >= 0,
      );
      TestValidator.equals(
        "author has valid created_at",
        typeof post.author.created_at === "string",
        true,
      );
      // 9. Validate community structure
      typia.assert(post.community);
      TestValidator.equals(
        "community has UUID id",
        /^[0-9a-f-]{36}$/i.test(post.community.id),
        true,
      );
      TestValidator.equals(
        "community has name",
        typeof post.community.name === "string",
        true,
      );
      TestValidator.predicate(
        "community has non-negative subscriber_count",
        post.community.subscriber_count >= 0,
      );
    }
    // 10. Validate pagination math
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages calculated correctly",
      pagination.pages,
      expectedPages,
    );
    // 11. Verify data array length matches records when page 1 returns all
    TestValidator.predicate(
      "data records match or are within pagination",
      trendingResponse.data.length <= pagination.records,
    );
  }
  // 12. Verify no soft-deleted posts appear (deleted_at IS NULL condition)
  const softDeletedPosts = trendingResponse.data.filter(
    (post) => post.deleted_at !== null,
  );
  TestValidator.equals(
    "no soft-deleted posts returned",
    softDeletedPosts.length,
    0,
  );
}
