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
export async function test_api_post_controversial_feed_public(
  connection: api.IConnection,
): Promise<void> {
  // The endpoint is public and does not require authentication
  // Call the controversial feed endpoint using the base connection
  const response =
    await api.functional.communityPlatform.member.posts.controversial.index(
      connection,
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.predicate(
    "pagination records >= 0",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => response.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is an array", () =>
    Array.isArray(response.data),
  );
  TestValidator.predicate("data length >= 0", () => response.data.length >= 0);
  // Validate structure of each post
  for (const post of response.data) {
    TestValidator.equals("post has id", typeof post.id, "string");
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals("post has voteScore", typeof post.voteScore, "number");
    TestValidator.equals(
      "post has commentCount",
      typeof post.commentCount,
      "number",
    );
    TestValidator.equals(
      "post has contentType",
      typeof post.contentType,
      "string",
    );
    TestValidator.equals(
      "post has contentSummary",
      typeof post.contentSummary,
      "string",
    );
    // contentType must be one of the allowed values
    TestValidator.predicate(
      "content type is valid",
      () =>
        post.contentType === "text" ||
        post.contentType === "link" ||
        post.contentType === "image",
    );
    // author and community are ICommunityPlatformMember.ISummary and ICommunityPlatformCommunity.ISummary
    // Both are defined as {} - empty objects - so we verify they are objects
    TestValidator.equals("author is object", typeof post.author, "object");
    TestValidator.equals(
      "community is object",
      typeof post.community,
      "object",
    );
    // Since ISummary is {}, we cannot validate any properties on author or community
  }
}
