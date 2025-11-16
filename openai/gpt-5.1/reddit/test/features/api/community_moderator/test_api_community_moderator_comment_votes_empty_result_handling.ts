import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Validate that the community moderator commentVotes search endpoint returns
 * empty pagination when filters do not match any votes, and that out-of-range
 * page indices are handled gracefully.
 *
 * Business flow:
 *
 * 1. Platform admin joins and configures one visibility level and one post type.
 * 2. Member user joins and creates a community using that visibility level.
 * 3. Member user creates a post in the community using the configured post type.
 * 4. Member user adds a comment to the post.
 * 5. Member user casts at least one vote on the comment so that the comment-votes
 *    table is non-empty.
 * 6. Community moderator joins (becoming the current authenticated actor).
 * 7. As community moderator, search commentVotes with a non-existent
 *    community_platform_comment_id to force an empty result.
 * 8. Assert that pagination.records and pagination.pages are 0 and data is empty.
 * 9. Repeat search with an out-of-range page index and assert behavior is still a
 *    well-formed empty page.
 */
export async function test_api_community_moderator_comment_votes_empty_result_handling(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create visibility level
  const visibilityCreateBody = {
    code: `vis-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create post type
  const postTypeCreateBody = {
    code: `post-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member creates community
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Member creates post
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Member creates comment
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 8. Member casts at least one vote on the comment so the table is non-empty
  const voteCreateBody = {
    community_platform_comment_id: comment.id,
    vote_value: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>,
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const vote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      { body: voteCreateBody },
    );
  typia.assert(vote);

  // 9. Community moderator joins (becomes current authenticated actor)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 10. As community moderator, search with non-existent comment ID
  const nonExistingCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const requestedPage = 1 as number & tags.Type<"int32">;
  const requestedLimit = 10 as number & tags.Type<"int32">;

  const emptySearchRequest = {
    page: requestedPage,
    limit: requestedLimit,
    community_platform_comment_id: nonExistingCommentId,
  } satisfies ICommunityPlatformCommentVote.IRequest;

  const emptyPage: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.communityModerator.commentVotes.index(
      connection,
      { body: emptySearchRequest },
    );
  typia.assert(emptyPage);

  const emptyPagination: IPage.IPagination = emptyPage.pagination;

  TestValidator.equals(
    "empty search should have zero records",
    emptyPagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should have zero pages",
    emptyPagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty search current page index should be non-negative",
    emptyPagination.current >= 0,
  );
  TestValidator.predicate(
    "empty search limit should be non-negative",
    emptyPagination.limit >= 0,
  );
  TestValidator.equals(
    "empty search data array should be empty",
    emptyPage.data.length,
    0,
  );

  // 11. Out-of-range page index with same non-matching filter
  const outOfRangePageIndex = 9999 as number & tags.Type<"int32">;

  const outOfRangeSearchRequest = {
    page: outOfRangePageIndex,
    limit: requestedLimit,
    community_platform_comment_id: nonExistingCommentId,
  } satisfies ICommunityPlatformCommentVote.IRequest;

  const outOfRangePage: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.communityModerator.commentVotes.index(
      connection,
      { body: outOfRangeSearchRequest },
    );
  typia.assert(outOfRangePage);

  const outOfRangePagination: IPage.IPagination = outOfRangePage.pagination;

  TestValidator.equals(
    "out-of-range search should still have zero records",
    outOfRangePagination.records,
    0,
  );
  TestValidator.equals(
    "out-of-range search should still have zero pages",
    outOfRangePagination.pages,
    0,
  );
  TestValidator.predicate(
    "out-of-range search current page index should be non-negative",
    outOfRangePagination.current >= 0,
  );
  TestValidator.predicate(
    "out-of-range search limit should be non-negative",
    outOfRangePagination.limit >= 0,
  );
  TestValidator.equals(
    "out-of-range search data array should be empty",
    outOfRangePage.data.length,
    0,
  );
}
