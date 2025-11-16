import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSnapshot";

export async function test_api_comment_snapshots_listing_for_edited_comment(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (and becomes authenticated as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.test/join",
    referrer: "https://admin.console.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level
  const visibilityCreateBody = {
    code: `vis_${RandomGenerator.alphabets(6)}`,
    name: "Public Visibility",
    description:
      "Visibility level for publicly accessible communities in tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Platform admin creates a post type
  const postTypeCreateBody = {
    code: `post_${RandomGenerator.alphabets(6)}`,
    name: "Text Post",
    description: "Simple text post type for comment snapshot testing.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Member user joins (and becomes authenticated as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@member.test`,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.test/signup",
    referrer: "https://app.test/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member user creates a community using the created visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: "Snapshot Test Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Member user creates a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: `Snapshot Test Post - ${RandomGenerator.paragraph({ sentences: 2 })}`,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Member user creates a comment under that post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
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

  // 8. Request snapshot list for the comment using PATCH /comments/{commentId}/snapshots
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const snapshotRequestBodyAsc = {
    page: requestPage,
    limit: requestLimit,
    sortOrder: "asc" as const,
    createdFrom: null,
    createdTo: null,
    includeSystemGenerated: true,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;

  const pageAsc: IPageICommunityPlatformCommentSnapshot.ISummary =
    await api.functional.communityPlatform.memberUser.comments.snapshots.index(
      connection,
      {
        commentId: comment.id,
        body: snapshotRequestBodyAsc,
      },
    );
  typia.assert(pageAsc);

  // 9. Basic pagination metadata validation for ascending order
  const paginationAsc: IPage.IPagination = pageAsc.pagination;
  typia.assert(paginationAsc);

  TestValidator.equals(
    "pagination current page should equal requested page (asc)",
    paginationAsc.current,
    requestPage,
  );
  TestValidator.predicate(
    "pagination limit should be positive and <= requested limit (asc)",
    paginationAsc.limit > 0 && paginationAsc.limit <= requestLimit,
  );

  // Ensure all snapshots belong to the created comment and post, and basic fields are valid
  for (const snapshot of pageAsc.data) {
    typia.assert<ICommunityPlatformCommentSnapshot.ISummary>(snapshot);

    TestValidator.equals(
      "snapshot comment_id should equal created comment id (asc)",
      snapshot.comment_id,
      comment.id,
    );
    TestValidator.equals(
      "snapshot post_id should equal post id (asc)",
      snapshot.post_id,
      post.id,
    );

    TestValidator.predicate(
      "snapshot depth should be non-negative int32 (asc)",
      snapshot.depth >= 0,
    );
  }

  // Check ascending order of created_at when there is more than one snapshot
  if (pageAsc.data.length > 1) {
    for (let i = 1; i < pageAsc.data.length; ++i) {
      const prev = pageAsc.data[i - 1];
      const curr = pageAsc.data[i];
      TestValidator.predicate(
        "snapshots should be ordered by created_at ascending",
        prev.created_at <= curr.created_at,
      );
    }
  }

  // We expect at least one snapshot to exist for the comment
  TestValidator.predicate(
    "at least one snapshot should be returned for the comment (asc)",
    pageAsc.data.length >= 1,
  );

  // 10. Also verify descending sort order using a second request
  const snapshotRequestBodyDesc = {
    page: requestPage,
    limit: requestLimit,
    sortOrder: "desc" as const,
    createdFrom: null,
    createdTo: null,
    includeSystemGenerated: true,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;

  const pageDesc: IPageICommunityPlatformCommentSnapshot.ISummary =
    await api.functional.communityPlatform.memberUser.comments.snapshots.index(
      connection,
      {
        commentId: comment.id,
        body: snapshotRequestBodyDesc,
      },
    );
  typia.assert(pageDesc);

  const paginationDesc: IPage.IPagination = pageDesc.pagination;
  typia.assert(paginationDesc);

  TestValidator.equals(
    "pagination current page should equal requested page (desc)",
    paginationDesc.current,
    requestPage,
  );
  TestValidator.predicate(
    "pagination limit should be positive and <= requested limit (desc)",
    paginationDesc.limit > 0 && paginationDesc.limit <= requestLimit,
  );

  for (const snapshot of pageDesc.data) {
    typia.assert<ICommunityPlatformCommentSnapshot.ISummary>(snapshot);

    TestValidator.equals(
      "snapshot comment_id should equal created comment id (desc)",
      snapshot.comment_id,
      comment.id,
    );
    TestValidator.equals(
      "snapshot post_id should equal post id (desc)",
      snapshot.post_id,
      post.id,
    );

    TestValidator.predicate(
      "snapshot depth should be non-negative int32 (desc)",
      snapshot.depth >= 0,
    );
  }

  if (pageDesc.data.length > 1) {
    for (let i = 1; i < pageDesc.data.length; ++i) {
      const prev = pageDesc.data[i - 1];
      const curr = pageDesc.data[i];
      TestValidator.predicate(
        "snapshots should be ordered by created_at descending",
        prev.created_at >= curr.created_at,
      );
    }
  }

  TestValidator.predicate(
    "at least one snapshot should be returned for the comment (desc)",
    pageDesc.data.length >= 1,
  );
}
