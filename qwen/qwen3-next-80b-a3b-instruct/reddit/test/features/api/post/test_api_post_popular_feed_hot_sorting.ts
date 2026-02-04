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
export async function test_api_post_popular_feed_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member account - required by scenario
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Call the hot feed endpoint - only available API function
  const hotFeed: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.member.posts.hot.index(
      memberConnection,
    );
  typia.assert(hotFeed);
  // Step 3: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    hotFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    hotFeed.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records should be greater than 0",
    hotFeed.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    hotFeed.pagination.pages >= 1,
  );
  // Step 4: Validate data array structure
  TestValidator.equals(
    "data should be an array",
    Array.isArray(hotFeed.data),
    true,
  );
  TestValidator.equals(
    "data should have at least one post",
    hotFeed.data.length > 0,
    true,
  );
  // Step 5: Validate each post summary structure
  for (const post of hotFeed.data) {
    // Validate existing properties of ISummary - ONLY properties that exist on ISummary type
    TestValidator.predicate(
      "post should have voteScore",
      typeof post.voteScore === "number" && Number.isInteger(post.voteScore),
    );
    TestValidator.predicate(
      "post should have commentCount",
      typeof post.commentCount === "number" &&
        Number.isInteger(post.commentCount) &&
        post.commentCount >= 0,
    );
    TestValidator.equals(
      "post should have createdAt",
      new Date(post.createdAt).toString() !== "Invalid Date",
      true,
    );
    // Skip validation of non-existent properties: text, title, id, author, community
    // Compiler errors confirm these properties do not exist on ISummary
  }
}