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

export async function test_api_community_moderator_comment_votes_time_range_and_sorting(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and seeds master data (visibility level and post type)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityLevelCode = `public_${RandomGenerator.alphaNumeric(8)}`;

  const visibilityLevelBody = {
    code: visibilityLevelCode,
    name: "Public Visibility",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeCode = `text_${RandomGenerator.alphaNumeric(8)}`;

  const postTypeBody = {
    code: postTypeCode,
    name: "Text Post",
    description: "Simple text-based post type for discussion threads",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeBody,
      },
    );
  typia.assert(postType);

  // 2. Member user joins and creates community, post, and comment
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  const communityBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  const postBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.name(),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 3. Member user creates multiple votes on the same comment with different timestamps
  const voteRecords: ICommunityPlatformCommentVote[] = [];

  const createVote = async (
    value: number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>,
  ) => {
    const voteBody = {
      community_platform_comment_id: comment.id,
      vote_value: value,
    } satisfies ICommunityPlatformCommentVote.ICreate;

    const vote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.commentVotes.create(
        connection,
        {
          body: voteBody,
        },
      );
    typia.assert(vote);
    voteRecords.push(vote);
  };

  await createVote(
    1 as number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>,
  );
  await createVote(
    -1 as number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>,
  );
  await createVote(
    1 as number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>,
  );

  // Ensure we have at least 3 votes and sort them by created_at ascending
  TestValidator.equals(
    "three votes should have been created",
    voteRecords.length,
    3,
  );

  voteRecords.sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );

  // Choose a time window that includes only the middle vote
  const middleVote = voteRecords[1];
  const createdFrom = voteRecords[1].created_at;
  const createdTo = voteRecords[1].created_at;

  // 4. Community moderator joins (auth context handled automatically)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@moderator.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 5. Query votes as community moderator with ascending order
  const ascRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    community_platform_memberuser_id: undefined,
    community_platform_comment_id: comment.id,
    vote_value: undefined,
    created_from: createdFrom,
    created_to: createdTo,
    order_by_created_at: "asc",
  } satisfies ICommunityPlatformCommentVote.IRequest;

  const ascPage: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.communityModerator.commentVotes.index(
      connection,
      {
        body: ascRequestBody,
      },
    );
  typia.assert(ascPage);

  // Filter local vote records within the same time window (inclusive)
  const inWindow = voteRecords.filter(
    (v) => v.created_at >= createdFrom && v.created_at <= createdTo,
  );

  // Pagination consistency
  TestValidator.equals(
    "pagination.records should equal number of filtered votes",
    ascPage.pagination.records,
    inWindow.length,
  );
  TestValidator.equals(
    "pagination.current should be 1",
    ascPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    ascPage.pagination.limit,
    10,
  );

  const expectedPages = inWindow.length === 0 ? 0 : 1;
  TestValidator.equals(
    "pagination.pages should match expected pages",
    ascPage.pagination.pages,
    expectedPages,
  );

  // Ascending order validation
  const expectedAscIds = inWindow
    .slice()
    .sort((a, b) =>
      a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
    )
    .map((v) => v.id);

  const actualAscIds = ascPage.data.map((s) => s.id);

  TestValidator.equals(
    "ascending query should return ids ordered by created_at asc",
    actualAscIds,
    expectedAscIds,
  );

  // Verify data itself is non-decreasing by created_at
  for (let i = 1; i < ascPage.data.length; i++) {
    const prev = ascPage.data[i - 1].created_at;
    const curr = ascPage.data[i].created_at;
    TestValidator.predicate(
      `asc created_at[${i - 1}] <= created_at[${i}]`,
      prev <= curr,
    );
  }

  // 6. Query votes with descending order
  const descRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    community_platform_memberuser_id: undefined,
    community_platform_comment_id: comment.id,
    vote_value: undefined,
    created_from: createdFrom,
    created_to: createdTo,
    order_by_created_at: "desc",
  } satisfies ICommunityPlatformCommentVote.IRequest;

  const descPage: IPageICommunityPlatformCommentVote.ISummary =
    await api.functional.communityPlatform.communityModerator.commentVotes.index(
      connection,
      {
        body: descRequestBody,
      },
    );
  typia.assert(descPage);

  const actualDescIds = descPage.data.map((s) => s.id);

  // The set of ids for asc and desc should be identical
  TestValidator.equals(
    "ascending and descending queries should return same id set",
    [...actualDescIds].sort(),
    [...actualAscIds].sort(),
  );

  const expectedDescIds = expectedAscIds.slice().reverse();
  TestValidator.equals(
    "descending query should return ids ordered by created_at desc",
    actualDescIds,
    expectedDescIds,
  );

  for (let i = 1; i < descPage.data.length; i++) {
    const prev = descPage.data[i - 1].created_at;
    const curr = descPage.data[i].created_at;
    TestValidator.predicate(
      `desc created_at[${i - 1}] >= created_at[${i}]`,
      prev >= curr,
    );
  }
}
