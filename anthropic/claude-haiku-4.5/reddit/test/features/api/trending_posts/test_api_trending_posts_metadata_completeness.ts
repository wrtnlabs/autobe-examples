import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTrendingPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingPost";

export async function test_api_trending_posts_metadata_completeness(
  connection: api.IConnection,
) {
  /**
   * Retrieve trending posts and verify complete metadata structure.
   *
   * This test validates that the trending posts API returns comprehensive
   * metadata for each post, including engagement metrics, trend indicators,
   * creator and community information, and all required fields for proper
   * display in trending feeds.
   */

  // Fetch trending posts from the API
  const response: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);
  typia.assert(response);

  // Validate response structure has pagination and data
  TestValidator.predicate(
    "response has pagination object",
    response.pagination !== undefined && response.pagination !== null,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data) && response.data.length > 0,
  );

  // Validate pagination metadata structure
  const pagination = response.pagination;
  typia.assert<IPage.IPagination>(pagination);
  TestValidator.predicate(
    "pagination current is non-negative integer",
    pagination.current >= 0 && Number.isInteger(pagination.current),
  );
  TestValidator.predicate(
    "pagination limit is non-negative integer",
    pagination.limit >= 0 && Number.isInteger(pagination.limit),
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    pagination.records >= 0 && Number.isInteger(pagination.records),
  );
  TestValidator.predicate(
    "pagination pages is non-negative integer",
    pagination.pages >= 0 && Number.isInteger(pagination.pages),
  );

  // Validate each trending post has complete metadata
  await ArrayUtil.asyncForEach(response.data, async (trendingPost) => {
    // Validate trending post structure
    typia.assert<ICommunityPlatformTrendingPost>(trendingPost);

    // Validate core identification fields
    TestValidator.predicate(
      "trending post has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trendingPost.id,
      ),
    );
    TestValidator.predicate(
      "trending post has valid postId UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trendingPost.postId,
      ),
    );
    TestValidator.predicate(
      "trending post has valid communityId UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trendingPost.communityId,
      ),
    );

    // Validate trending type is "post"
    TestValidator.equals(
      "trending type must be post",
      trendingPost.trendingType,
      "post",
    );

    // Validate trending category
    TestValidator.predicate(
      "trending category is valid",
      ["hot", "new", "top", "controversial"].includes(
        trendingPost.trendingCategory,
      ),
    );

    // Validate engagement metrics
    TestValidator.predicate(
      "upvote count is non-negative integer",
      trendingPost.upvoteCount >= 0 &&
        Number.isInteger(trendingPost.upvoteCount),
    );
    TestValidator.predicate(
      "downvote count is non-negative integer",
      trendingPost.downvoteCount >= 0 &&
        Number.isInteger(trendingPost.downvoteCount),
    );
    TestValidator.predicate(
      "comment count is non-negative integer",
      trendingPost.commentCount >= 0 &&
        Number.isInteger(trendingPost.commentCount),
    );
    TestValidator.predicate(
      "subscriber count is non-negative integer",
      trendingPost.subscriberCount >= 0 &&
        Number.isInteger(trendingPost.subscriberCount),
    );

    // Validate trending scores based on category
    if (trendingPost.trendingCategory === "hot") {
      TestValidator.predicate(
        "hot category has hotScore",
        trendingPost.hotScore !== null && trendingPost.hotScore !== undefined,
      );
      TestValidator.predicate(
        "hot score is number",
        typeof trendingPost.hotScore === "number",
      );
    }
    if (trendingPost.trendingCategory === "top") {
      TestValidator.predicate(
        "top category has topScore",
        trendingPost.topScore !== null && trendingPost.topScore !== undefined,
      );
      TestValidator.predicate(
        "top score is integer",
        typeof trendingPost.topScore === "number" &&
          Number.isInteger(trendingPost.topScore),
      );
    }
    if (trendingPost.trendingCategory === "controversial") {
      TestValidator.predicate(
        "controversial category has controversyScore",
        trendingPost.controversyScore !== null &&
          trendingPost.controversyScore !== undefined,
      );
      TestValidator.predicate(
        "controversy score is non-negative integer",
        typeof trendingPost.controversyScore === "number" &&
          Number.isInteger(trendingPost.controversyScore) &&
          trendingPost.controversyScore >= 0,
      );
    }
    if (trendingPost.trendingCategory === "new") {
      TestValidator.predicate(
        "new category has trendVelocity",
        trendingPost.trendVelocity !== null &&
          trendingPost.trendVelocity !== undefined,
      );
      TestValidator.predicate(
        "trend velocity is number",
        typeof trendingPost.trendVelocity === "number",
      );
    }

    // Validate rank
    TestValidator.predicate(
      "rank is positive integer",
      trendingPost.rank >= 1 && Number.isInteger(trendingPost.rank),
    );

    // Validate timestamps
    TestValidator.predicate(
      "created_at is valid ISO datetime",
      !isNaN(Date.parse(trendingPost.createdAt)),
    );
    TestValidator.predicate(
      "refreshed_at is valid ISO datetime",
      !isNaN(Date.parse(trendingPost.refreshedAt)),
    );

    // Validate post summary object
    typia.assert<ICommunityPlatformPost.ISummary>(trendingPost.post);
    TestValidator.predicate(
      "post has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trendingPost.post.id,
      ),
    );
    TestValidator.predicate(
      "post has title",
      typeof trendingPost.post.title === "string" &&
        trendingPost.post.title.length > 0,
    );
    TestValidator.predicate(
      "post has valid post_type",
      ["text", "link", "image"].includes(trendingPost.post.post_type),
    );
    TestValidator.predicate(
      "post has vote_score",
      typeof trendingPost.post.vote_score === "number" &&
        trendingPost.post.vote_score >= 0,
    );
    TestValidator.predicate(
      "post has upvote_count",
      typeof trendingPost.post.upvote_count === "number" &&
        trendingPost.post.upvote_count >= 0,
    );
    TestValidator.predicate(
      "post has downvote_count",
      typeof trendingPost.post.downvote_count === "number" &&
        trendingPost.post.downvote_count >= 0,
    );
    TestValidator.predicate(
      "post has comment_count",
      typeof trendingPost.post.comment_count === "number" &&
        trendingPost.post.comment_count >= 0,
    );
    TestValidator.predicate(
      "post has valid visibility_status",
      ["public", "archived", "deleted", "removed_by_moderator"].includes(
        trendingPost.post.visibility_status,
      ),
    );
    TestValidator.predicate(
      "post has is_nsfw boolean",
      typeof trendingPost.post.is_nsfw === "boolean",
    );
    TestValidator.predicate(
      "post has has_spoiler boolean",
      typeof trendingPost.post.has_spoiler === "boolean",
    );
    TestValidator.predicate(
      "post has is_locked boolean",
      typeof trendingPost.post.is_locked === "boolean",
    );
    TestValidator.predicate(
      "post has is_pinned boolean",
      typeof trendingPost.post.is_pinned === "boolean",
    );
    TestValidator.predicate(
      "post created_at is valid ISO datetime",
      !isNaN(Date.parse(trendingPost.post.created_at)),
    );
    TestValidator.predicate(
      "post updated_at is valid ISO datetime",
      !isNaN(Date.parse(trendingPost.post.updated_at)),
    );

    // Validate post content fields based on post type
    if (trendingPost.post.post_type === "text") {
      TestValidator.predicate(
        "text post has content_text",
        trendingPost.post.content_text !== null &&
          trendingPost.post.content_text !== undefined &&
          typeof trendingPost.post.content_text === "string",
      );
      TestValidator.predicate(
        "text post content_link_url is null",
        trendingPost.post.content_link_url === null ||
          trendingPost.post.content_link_url === undefined,
      );
    } else if (trendingPost.post.post_type === "link") {
      TestValidator.predicate(
        "link post has content_link_url",
        trendingPost.post.content_link_url !== null &&
          trendingPost.post.content_link_url !== undefined &&
          typeof trendingPost.post.content_link_url === "string",
      );
      TestValidator.predicate(
        "link post has content_link_title",
        trendingPost.post.content_link_title === null ||
          trendingPost.post.content_link_title === undefined ||
          typeof trendingPost.post.content_link_title === "string",
      );
      TestValidator.predicate(
        "link post has content_link_description",
        trendingPost.post.content_link_description === null ||
          trendingPost.post.content_link_description === undefined ||
          typeof trendingPost.post.content_link_description === "string",
      );
    }

    // Validate creator (member summary) object
    typia.assert<ICommunityPlatformMember.ISummary>(trendingPost.post.creator);
    TestValidator.predicate(
      "creator has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trendingPost.post.creator.id,
      ),
    );
    TestValidator.predicate(
      "creator has username",
      typeof trendingPost.post.creator.username === "string" &&
        trendingPost.post.creator.username.length >= 3 &&
        trendingPost.post.creator.username.length <= 50,
    );
    TestValidator.predicate(
      "creator has email",
      typeof trendingPost.post.creator.email === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trendingPost.post.creator.email),
    );
    TestValidator.predicate(
      "creator has email_verified boolean",
      typeof trendingPost.post.creator.email_verified === "boolean",
    );
    TestValidator.predicate(
      "creator has valid account_status",
      ["active", "suspended", "pending_deletion", "deleted"].includes(
        trendingPost.post.creator.account_status,
      ),
    );
    TestValidator.predicate(
      "creator has karma_score",
      typeof trendingPost.post.creator.karma_score === "number" &&
        trendingPost.post.creator.karma_score >= 0,
    );
    TestValidator.predicate(
      "creator created_at is valid ISO datetime",
      !isNaN(Date.parse(trendingPost.post.creator.created_at)),
    );

    // Validate community (community summary) object
    typia.assert<ICommunityPlatformCommunity.ISummary>(trendingPost.community);
    TestValidator.predicate(
      "community has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trendingPost.community.id,
      ),
    );
    TestValidator.predicate(
      "community has identifier",
      typeof trendingPost.community.identifier === "string" &&
        /^[a-z0-9_]{3,32}$/.test(trendingPost.community.identifier),
    );
    TestValidator.predicate(
      "community has name",
      typeof trendingPost.community.name === "string" &&
        trendingPost.community.name.length >= 3 &&
        trendingPost.community.name.length <= 100,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      typeof trendingPost.community.subscriber_count === "number" &&
        trendingPost.community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community has post_count",
      typeof trendingPost.community.post_count === "number" &&
        trendingPost.community.post_count >= 0,
    );
    TestValidator.predicate(
      "community created_at is valid ISO datetime",
      !isNaN(Date.parse(trendingPost.community.created_at)),
    );
  });

  // Validate that trending post data matches pagination info
  TestValidator.predicate(
    "data array length respects limit",
    response.data.length <= pagination.limit,
  );
}
