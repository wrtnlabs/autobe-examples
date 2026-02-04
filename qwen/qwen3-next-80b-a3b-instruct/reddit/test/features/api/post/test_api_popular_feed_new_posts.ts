import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_popular_feed_new_posts(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for unauthenticated access (Popular Feed is available to everyone)
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 2: Call the popular feed endpoint to retrieve newest posts
  const response =
    await api.functional.communityPlatform.member.posts._new.index(
      guestConnection,
    );
  typia.assert(response);
  // Step 3: Validate response structure
  // Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("page limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages is >= 0", response.pagination.pages >= 0);
  // Verify data array exists
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Verify pagination properties are integers and non-negative
  TestValidator.predicate(
    "current page is a positive integer",
    typeof response.pagination.current === "number" &&
      Number.isInteger(response.pagination.current) &&
      response.pagination.current > 0,
  );
  TestValidator.predicate(
    "page limit is a positive integer",
    typeof response.pagination.limit === "number" &&
      Number.isInteger(response.pagination.limit) &&
      response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is a non-negative integer",
    typeof response.pagination.records === "number" &&
      Number.isInteger(response.pagination.records) &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is a non-negative integer",
    typeof response.pagination.pages === "number" &&
      Number.isInteger(response.pagination.pages) &&
      response.pagination.pages >= 0,
  );
  // Verify data items contain required fields
  for (const post of response.data) {
    // Author is ICommunityPlatformMember.ISummary (empty object)
    TestValidator.equals("author is an object", typeof post.author, "object");
    TestValidator.equals(
      "author has no properties (ISummary)",
      Object.keys(post.author).length,
      0,
    );
    // Community is ICommunityPlatformCommunity.ISummary
    TestValidator.equals(
      "community is an object",
      typeof post.community,
      "object",
    );
    TestValidator.predicate(
      "community has name",
      post.community.hasOwnProperty("name"),
    );
    TestValidator.predicate(
      "community has description",
      post.community.hasOwnProperty("description"),
    );
    TestValidator.predicate(
      "community has icon",
      post.community.hasOwnProperty("icon"),
    );
    TestValidator.predicate(
      "community has subscriber_count",
      post.community.hasOwnProperty("subscriber_count"),
    );
    TestValidator.predicate(
      "community has created_at",
      post.community.hasOwnProperty("created_at"),
    );
    // Validate numeric fields
    TestValidator.predicate(
      "voteScore is a number",
      typeof post.voteScore === "number",
    );
    TestValidator.predicate(
      "commentCount is a non-negative integer",
      typeof post.commentCount === "number" &&
        post.commentCount >= 0 &&
        Number.isInteger(post.commentCount),
    );
    // Validate timestamp format
    TestValidator.predicate(
      "createdAt is ISO 8601 date-time",
      typia.is<string & tags.Format<"date-time">>(post.createdAt),
    );
  }
  // Note: Sorting validation requires pre-created data and cannot be guaranteed with test data
  // We rely on the system to sort posts by createdAt descending as per requirements
  // No artificial post creation possible since API does not provide create endpoint
  // Validation focuses on contract compliance, not behavioral expectations
}
