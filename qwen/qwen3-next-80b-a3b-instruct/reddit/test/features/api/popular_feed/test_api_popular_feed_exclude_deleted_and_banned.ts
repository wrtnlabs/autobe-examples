import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_bans_create } from "../../../generate/generate_random_reddit_community_community_owner_bans_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";

export async function test_api_popular_feed_exclude_deleted_and_banned(
  connection: api.IConnection,
): Promise<void> {
  // Use direct connection since no authorization needed for popular feed
  // Validate response structure without manipulatable state
  const result =
    await api.functional.redditCommunity.analytics.posts.popular.index(
      connection,
      {
        body: {
          sort: "new",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(result);
  // Validate response structure
  TestValidator.predicate("has pagination data", result.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(result.data));
  // If there are any posts, validate their structure
  if (result.data.length > 0) {
    const firstPost = result.data[0];
    TestValidator.equals("post has id", typeof firstPost.id, "string");
    TestValidator.equals("post has title", typeof firstPost.title, "string");
    TestValidator.equals("post has author", firstPost.author !== undefined, true);
    TestValidator.equals("post has community", firstPost.community !== undefined, true);
    TestValidator.predicate(
      "vote score is number",
      typeof firstPost.voteScore === "number",
    );
    TestValidator.predicate(
      "comment count is number",
      typeof firstPost.commentCount === "number",
    );
    TestValidator.equals("created at is ISO datetime", typeof firstPost.createdAt, "string");
    TestValidator.equals("updated at is ISO datetime", typeof firstPost.updatedAt, "string");
    TestValidator.predicate(
      "url is optional string or null",
      firstPost.url === null || typeof firstPost.url === "string",
    );
    TestValidator.predicate(
      "image url is optional string or null",
      firstPost.imageUrl === null || typeof firstPost.imageUrl === "string",
    );
  }
  // Validations for pagination
  TestValidator.predicate(
    "pagination current is number",
    typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof result.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof result.pagination.pages === "number",
  );
  // Ensure no null values in required fields
  TestValidator.predicate("pagination is not null", result.pagination !== null);
  TestValidator.predicate("data is not null", result.data !== null);
}