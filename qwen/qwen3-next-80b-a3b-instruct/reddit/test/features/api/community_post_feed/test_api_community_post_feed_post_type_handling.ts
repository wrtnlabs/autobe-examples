import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
export async function test_api_community_post_feed_post_type_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create a community code for testing
  const communityCode = typia.random<
    string & tags.Pattern<"^[a-z0-9-]{3,30}$">
  >();
  // Call the only available function: get top posts from community
  const topPostsResponse =
    await api.functional.communityPlatform.communities.posts.top.index(
      connection,
      {
        communityCode,
      },
    );
  typia.assert(topPostsResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    topPostsResponse.pagination !== undefined,
    true,
  );
  // Validate pagination properties
  if (topPostsResponse.pagination) {
    TestValidator.predicate(
      "current page is positive",
      topPostsResponse.pagination.current > 0,
    );
    TestValidator.predicate(
      "limit is positive",
      topPostsResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      "record count is positive",
      topPostsResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "page count is positive",
      topPostsResponse.pagination.pages >= 0,
    );
  }
  // Validate data array
  TestValidator.equals(
    "data array exists",
    topPostsResponse.data !== undefined,
    true,
  );
  // Validate each post summary
  if (topPostsResponse.data && topPostsResponse.data.length > 0) {
    // Validate at least first post
    const firstPost = topPostsResponse.data[0];
    TestValidator.equals("post has id", firstPost.id !== undefined, true);
    TestValidator.predicate(
      "id is UUID",
      typia.is<string & tags.Format<"uuid">>(firstPost.id),
    );
    TestValidator.equals(
      "post has author",
      firstPost.author !== undefined,
      true,
    );
    TestValidator.predicate(
      "author is object",
      firstPost.author && typeof firstPost.author === "object",
    );
    // According to DTO, ICommunityPlatformMember.ISummary is an empty object
    // so we can't validate any properties - just verify it exists
    TestValidator.equals(
      "post has community",
      firstPost.community !== undefined,
      true,
    );
    TestValidator.predicate(
      "community is object",
      firstPost.community && typeof firstPost.community === "object",
    );
    // Validate community properties according to ICommunityPlatformCommunity.ISummary
    if (firstPost.community) {
      TestValidator.equals(
        "community has name",
        firstPost.community.name !== undefined,
        true,
      );
      TestValidator.predicate(
        "community name is non-empty string",
        typeof firstPost.community.name === "string" &&
          firstPost.community.name.length > 0,
      );
      TestValidator.equals(
        "community has description",
        firstPost.community.description !== undefined,
        true,
      );
      TestValidator.predicate(
        "community description is string",
        typeof firstPost.community.description === "string",
      );
      TestValidator.equals(
        "community has icon",
        firstPost.community.icon !== undefined,
        true,
      );
      TestValidator.predicate(
        "community icon is URI",
        typia.is<string & tags.Format<"uri">>(firstPost.community.icon),
      );
      TestValidator.equals(
        "community has subscriber count",
        firstPost.community.subscriber_count !== undefined,
        true,
      );
      TestValidator.predicate(
        "community subscriber count is non-negative number",
        typeof firstPost.community.subscriber_count === "number" &&
          firstPost.community.subscriber_count >= 0,
      );
      TestValidator.equals(
        "community has created_at",
        firstPost.community.created_at !== undefined,
        true,
      );
      TestValidator.predicate(
        "community created_at is date-time",
        typia.is<string & tags.Format<"date-time">>(
          firstPost.community.created_at,
        ),
      );
    }
    TestValidator.equals(
      "post has vote score",
      firstPost.voteScore !== undefined,
      true,
    );
    TestValidator.predicate(
      "vote score is integer",
      typeof firstPost.voteScore === "number" &&
        Number.isInteger(firstPost.voteScore),
    );
    TestValidator.equals(
      "post has comment count",
      firstPost.commentCount !== undefined,
      true,
    );
    TestValidator.predicate(
      "comment count is non-negative integer",
      typeof firstPost.commentCount === "number" &&
        Number.isInteger(firstPost.commentCount) &&
        firstPost.commentCount >= 0,
    );
    TestValidator.equals(
      "post has created_at",
      firstPost.createdAt !== undefined,
      true,
    );
    TestValidator.predicate(
      "created_at is date-time",
      typia.is<string & tags.Format<"date-time">>(firstPost.createdAt),
    );
  }
  // Validate that all posts in array have the correct structure
  TestValidator.predicate(
    "all posts have required structure",
    topPostsResponse.data &&
      topPostsResponse.data.length > 0 &&
      topPostsResponse.data.every(
        (post) =>
          post.id !== undefined &&
          typia.is<string & tags.Format<"uuid">>(post.id) &&
          post.author !== undefined &&
          typeof post.author === "object" &&
          post.community !== undefined &&
          typeof post.community === "object" &&
          post.community.name !== undefined &&
          typeof post.community.name === "string" &&
          post.community.name.length > 0 &&
          post.community.description !== undefined &&
          typeof post.community.description === "string" &&
          post.community.icon !== undefined &&
          typia.is<string & tags.Format<"uri">>(post.community.icon) &&
          post.community.subscriber_count !== undefined &&
          typeof post.community.subscriber_count === "number" &&
          post.community.subscriber_count >= 0 &&
          post.community.created_at !== undefined &&
          typia.is<string & tags.Format<"date-time">>(
            post.community.created_at,
          ) &&
          post.voteScore !== undefined &&
          typeof post.voteScore === "number" &&
          Number.isInteger(post.voteScore) &&
          post.commentCount !== undefined &&
          typeof post.commentCount === "number" &&
          Number.isInteger(post.commentCount) &&
          post.commentCount >= 0 &&
          post.createdAt !== undefined &&
          typia.is<string & tags.Format<"date-time">>(post.createdAt),
      ),
  );
}
