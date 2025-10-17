import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_redditcommunity_community_posts_listing_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberCreateBody = {
    email: `${RandomGenerator.alphaNumeric(15)}@example.com`,
    password: "securePassword123",
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 6,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create multiple posts of different types
  const postTypes = ["text", "link", "image"] as const;

  // Create 5 posts (mix of types)
  const createdPosts = await ArrayUtil.asyncRepeat(5, async () => {
    const postType = RandomGenerator.pick(postTypes);

    const basePostBody = {
      reddit_community_community_id: community.id,
      post_type: postType,
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
    };

    let postBody: IRedditCommunityPosts.ICreate;

    if (postType === "text") {
      postBody = {
        ...basePostBody,
        body_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditCommunityPosts.ICreate;
    } else if (postType === "link") {
      postBody = {
        ...basePostBody,
        link_url: `https://${RandomGenerator.alphaNumeric(10)}.com`,
      } satisfies IRedditCommunityPosts.ICreate;
    } else if (postType === "image") {
      postBody = {
        ...basePostBody,
        image_url: `https://images.example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
      } satisfies IRedditCommunityPosts.ICreate;
    } else {
      throw new Error("Unknown post type");
    }

    const newPost =
      await api.functional.redditCommunity.member.communities.posts.createPost(
        connection,
        {
          communityId: community.id,
          body: postBody,
        },
      );
    typia.assert(newPost);
    return newPost;
  });

  // 4. Retrieve posts using listing API with various filters and pagination
  //    We will test: no filter (default), filter by each post_type, filter by creation date

  const filterOptions: (IRedditCommunityPost.IRequest | undefined)[] = [
    undefined, // no filter
    ...postTypes.map((type) => ({ post_type: type })),
  ];

  // Get oldest and newest created_at for date range
  const sortedByCreatedAt = [...createdPosts].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const createdAfterTimestamp = new Date(
    sortedByCreatedAt[0].created_at,
  ).toISOString();
  const createdBeforeTimestamp = new Date(
    sortedByCreatedAt[sortedByCreatedAt.length - 1].created_at,
  ).toISOString();

  filterOptions.push({ created_after: createdAfterTimestamp });
  filterOptions.push({ created_before: createdBeforeTimestamp });
  filterOptions.push({
    created_after: createdAfterTimestamp,
    created_before: createdBeforeTimestamp,
  });

  for (const option of filterOptions) {
    const body = option ?? {};

    const response: IPageIRedditCommunityPost.ISummary =
      await api.functional.redditCommunity.communities.posts.index(connection, {
        communityId: community.id,
        body,
      });
    typia.assert(response);

    // Validate all posts are from the correct community
    for (const post of response.data) {
      TestValidator.equals(
        "post community id matches",
        post.reddit_community_community_id,
        community.id,
      );

      // Validate filters
      if (option?.post_type !== undefined) {
        TestValidator.equals(
          "post_type filter matched",
          post.post_type,
          option.post_type,
        );
      }
      if (option?.created_after !== undefined) {
        TestValidator.predicate(
          "post created after filter",
          new Date(post.created_at) >= new Date(option.created_after!),
        );
      }
      if (option?.created_before !== undefined) {
        TestValidator.predicate(
          "post created before filter",
          new Date(post.created_at) <= new Date(option.created_before!),
        );
      }
    }

    // Validate pagination info
    TestValidator.predicate(
      "pagination current page >= 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit between 1 and 100",
      response.pagination.limit >= 1 && response.pagination.limit <= 100,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= data length",
      response.pagination.records >= response.data.length,
    );
  }

  // 5. Test sorting alternatives
  const sortTypes: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];

  for (const sortType of sortTypes) {
    const body: IRedditCommunityPost.IRequest = {
      sort: sortType,
      limit: 10,
      page: 1,
    };
    const response: IPageIRedditCommunityPost.ISummary =
      await api.functional.redditCommunity.communities.posts.index(connection, {
        communityId: community.id,
        body,
      });
    typia.assert(response);
    TestValidator.predicate(
      `post list sort type '${sortType}' returns data`,
      response.data.length <= 10 && response.data.length >= 0,
    );
    // Additional sorting result correctness tests would require detailed voting, score data
  }
}
