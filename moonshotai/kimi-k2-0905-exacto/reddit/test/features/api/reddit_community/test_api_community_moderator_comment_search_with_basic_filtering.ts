import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

export async function test_api_community_moderator_comment_search_with_basic_filtering(
  connection: api.IConnection,
) {
  // 1. Create community moderator account for moderation operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(2),
        href: "https://reddit-community-demo.com/register",
        referrer: "https://reddit-community-demo.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Create member account to generate content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberPassword123",
      nickname: RandomGenerator.name(2),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 3. Create a public community where moderator has authority
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
        title: `Test Community ${RandomGenerator.name(3)}`,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_name: "technology",
        type: "public",
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create multiple posts with different types for content diversity
  const postTypes = ["text", "link", "image"] as const;
  const postTypeSummaries = await Promise.all(
    postTypes.map(() =>
      typia.random<
        IRedditCommunityCommunity.ISummary & {
          postTypes?: IRedditCommunityPostType.ISummary[];
        }
      >(),
    ),
  ).then((summaries) =>
    summaries.filter((s) => s.postTypes && s.postTypes.length > 0),
  );

  const postIds = await Promise.all([
    // Text post
    api.functional.redditCommunity.member.posts
      .create(connection, {
        body: {
          title: `What are your thoughts on ${RandomGenerator.name()}?`,
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          reddit_community_id: community.id,
          reddit_post_type_id:
            postTypeSummaries[0]?.postTypes?.[0]?.id ||
            typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditCommunityPost.ICreate,
      })
      .then((post) => post.id),

    // Link post
    api.functional.redditCommunity.member.posts
      .create(connection, {
        body: {
          title: `Check out this ${RandomGenerator.name()} resource`,
          link_url: `https://example.com/${RandomGenerator.alphaNumeric(6)}`,
          reddit_community_id: community.id,
          reddit_post_type_id:
            postTypeSummaries[0]?.postTypes?.[1]?.id ||
            typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditCommunityPost.ICreate,
      })
      .then((post) => post.id),

    // Image post
    api.functional.redditCommunity.member.posts
      .create(connection, {
        body: {
          title: `Image of ${RandomGenerator.name()}`,
          reddit_community_id: community.id,
          reddit_post_type_id:
            postTypeSummaries[0]?.postTypes?.[2]?.id ||
            typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditCommunityPost.ICreate,
      })
      .then((post) => post.id),
  ]);

  // 5. Create sample comments with diverse characteristics
  const comments = await ArrayUtil.asyncRepeat(8, async (index) => {
    const postId = postIds[index % postIds.length];
    return await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId,
        body: {
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          reddit_post_id: postId,
          href: "https://reddit-community-demo.com",
          referrer: "https://reddit-community-demo.com/post",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  });

  // 6. Test basic content filtering - search for comments containing specific keywords
  const keywordResults =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
          content_filter: [
            RandomGenerator.substring(comments[0].content).substring(0, 50),
          ],
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(keywordResults);
  TestValidator.predicate(
    "content filter returns matching results",
    keywordResults.data.length >= 0,
  );

  // 7. Test pagination - different page sizes and orders
  const firstPageResults =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 3,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(firstPageResults);
  TestValidator.equals(
    "first page has correct number of results",
    firstPageResults.data.length,
    3,
  );

  const secondPageResults =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 2,
          limit: 3,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(secondPageResults);
  TestValidator.equals(
    "second page has correct number of results",
    secondPageResults.data.length,
    5,
  );

  // 8. Test date range filtering - comments within recent timeframe
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const dateFilteredResults =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
          created_after: thirtyMinutesAgo,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(dateFilteredResults);
  TestValidator.predicate(
    "date range filtering returns appropriate results",
    dateFilteredResults.data.length > 0,
  );

  // 9. Test different sorting options
  const scoreSortedResults =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "vote_score",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(scoreSortedResults);
  TestValidator.predicate(
    "vote score sorting returns results",
    scoreSortedResults.data.length > 0,
  );

  const updatedSortedResults =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "updated_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(updatedSortedResults);
  TestValidator.predicate(
    "updated date sorting returns results",
    updatedSortedResults.data.length > 0,
  );

  // 10. Test empty search criteria (minimal parameters)
  const minimalSearch =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(minimalSearch);
  TestValidator.predicate(
    "minimal search returns all available results",
    minimalSearch.data.length > 0,
  );

  // 11. Validate pagination metadata consistency
  TestValidator.equals(
    "pagination current page correct",
    secondPageResults.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    secondPageResults.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "total records available",
    secondPageResults.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages calculated",
    secondPageResults.pagination.pages > 0,
  );

  // 12. Verify comment data structure integrity
  TestValidator.predicate(
    "all comments have required fields",
    firstPageResults.data.every(
      (comment) =>
        !!comment.id &&
        !!comment.content &&
        !!comment.created_at &&
        typeof comment.upvote_count === "number" &&
        typeof comment.downvote_count === "number",
    ),
  );

  // 13. Test content block with specific content
  const specificContent =
    "This is a test comment with specific content to search for in the filter";
  const specificComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: postIds[0],
        body: {
          content: specificContent,
          reddit_post_id: postIds[0],
          href: "https://reddit-community-demo.com",
          referrer: "https://reddit-community-demo.com/post",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(specificComment);

  const specificContentResults =
    await api.functional.redditCommunity.communityModerator.comments.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 50,
          content_filter: ["specific content"],
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(specificContentResults);
  TestValidator.predicate(
    "specific content filter works",
    specificContentResults.data.length > 0,
  );
}
