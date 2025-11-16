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

/**
 * Validate pagination when listing comment snapshots for a single comment
 * across multiple pages.
 *
 * Business context:
 *
 * - Platform admins configure visibility levels and post types.
 * - Member users create communities, posts, and comments.
 * - Comment edit history is tracked in comment snapshot records, which can be
 *   listed with pagination.
 *
 * This test focuses on the read-only snapshot listing endpoint and the
 * consistency of pagination metadata and page contents when navigating between
 * pages.
 *
 * High-level flow:
 *
 * 1. Register a platform admin and create a visibility level and post type.
 * 2. Register a member user and create a community, post, and comment.
 * 3. Call the comment snapshot listing endpoint for page 1.
 * 4. If only a single page of snapshots exists, validate basic pagination
 *    invariants and stop.
 * 5. If multiple pages exist, fetch page 2 (and optionally page 3) and verify:
 *
 *    - Pagination metadata is stable (records/pages) across pages.
 *    - `pagination.current` matches the requested page.
 *    - `pagination.limit` matches the requested limit.
 *    - Snapshot IDs between page 1 and page 2 do not overlap.
 *    - `created_at` is sorted ascending according to sortOrder.
 *    - All snapshots belong to the target comment.
 */
export async function test_api_comment_snapshots_listing_pagination_across_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type
  const postTypeCode = `type_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeBody },
    );
  typia.assert(postType);

  // 4. Register a member user (also authenticates as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 5. Create a community as the member user
  const communityBody = {
    identifier: `comm_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 6. Create a post in that community
  const postBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 7. Create a comment under the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 8. Call the snapshot listing endpoint with pagination
  const limit = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const firstPageRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sortOrder: "asc",
    createdFrom: undefined,
    createdTo: undefined,
    includeSystemGenerated: undefined,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;

  const page1: IPageICommunityPlatformCommentSnapshot.ISummary =
    await api.functional.communityPlatform.memberUser.comments.snapshots.index(
      connection,
      {
        commentId: comment.id,
        body: firstPageRequest,
      },
    );
  typia.assert(page1);

  const page1Snapshots = page1.data;
  const page1Pagination = page1.pagination;

  // Basic invariants for page 1
  TestValidator.equals("page 1 current page index", page1Pagination.current, 1);
  TestValidator.equals(
    "page 1 limit matches request",
    page1Pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "page 1 records non-negative",
    page1Pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1Pagination.pages >= 0,
  );
  TestValidator.equals(
    "page 1 data length not exceeding limit",
    page1Snapshots.length,
    Math.min(page1Pagination.records, limit),
  );

  // Verify all snapshots (if any) belong to the comment and are sorted asc
  for (const snapshot of page1Snapshots) {
    TestValidator.equals(
      "snapshot comment_id matches target comment on page 1",
      snapshot.comment_id,
      comment.id,
    );
  }
  for (let i = 1; i < page1Snapshots.length; i++) {
    const prev = page1Snapshots[i - 1];
    const curr = page1Snapshots[i];
    TestValidator.predicate(
      "page 1 created_at ascending",
      prev.created_at <= curr.created_at,
    );
  }

  // If there is only one page worth of records, stop after basic checks
  if (page1Pagination.records <= limit || page1Pagination.pages <= 1) {
    return;
  }

  // 9. Fetch page 2 and validate metadata stability and non-overlap
  const secondPageRequest = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sortOrder: "asc",
    createdFrom: undefined,
    createdTo: undefined,
    includeSystemGenerated: undefined,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;

  const page2: IPageICommunityPlatformCommentSnapshot.ISummary =
    await api.functional.communityPlatform.memberUser.comments.snapshots.index(
      connection,
      {
        commentId: comment.id,
        body: secondPageRequest,
      },
    );
  typia.assert(page2);

  const page2Snapshots = page2.data;
  const page2Pagination = page2.pagination;

  TestValidator.equals("page 2 current page index", page2Pagination.current, 2);
  TestValidator.equals(
    "page 2 limit matches request",
    page2Pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page 2 records equals page 1 records",
    page2Pagination.records,
    page1Pagination.records,
  );
  TestValidator.equals(
    "page 2 pages equals page 1 pages",
    page2Pagination.pages,
    page1Pagination.pages,
  );
  TestValidator.equals(
    "page 2 data length not exceeding limit",
    page2Snapshots.length,
    Math.min(page2Pagination.records - limit, limit),
  );

  // Collect IDs from page 1 and ensure no overlap with page 2
  const page1Ids = new Set(page1Snapshots.map((s) => s.id));
  for (const snapshot of page2Snapshots) {
    TestValidator.equals(
      "snapshot comment_id matches target comment on page 2",
      snapshot.comment_id,
      comment.id,
    );
    TestValidator.predicate(
      "snapshot id not duplicated between page 1 and 2",
      page1Ids.has(snapshot.id) === false,
    );
  }
  for (let i = 1; i < page2Snapshots.length; i++) {
    const prev = page2Snapshots[i - 1];
    const curr = page2Snapshots[i];
    TestValidator.predicate(
      "page 2 created_at ascending",
      prev.created_at <= curr.created_at,
    );
  }

  // 10. Optionally validate page 3 if available
  if (page2Pagination.pages >= 3) {
    const thirdPageRequest = {
      page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit,
      sortOrder: "asc",
      createdFrom: undefined,
      createdTo: undefined,
      includeSystemGenerated: undefined,
    } satisfies ICommunityPlatformCommentSnapshot.IRequest;

    const page3: IPageICommunityPlatformCommentSnapshot.ISummary =
      await api.functional.communityPlatform.memberUser.comments.snapshots.index(
        connection,
        {
          commentId: comment.id,
          body: thirdPageRequest,
        },
      );
    typia.assert(page3);

    const page3Snapshots = page3.data;
    const page3Pagination = page3.pagination;

    TestValidator.equals(
      "page 3 current page index",
      page3Pagination.current,
      3,
    );
    TestValidator.equals(
      "page 3 limit matches request",
      page3Pagination.limit,
      limit,
    );
    TestValidator.equals(
      "page 3 records equals page 1 records",
      page3Pagination.records,
      page1Pagination.records,
    );
    TestValidator.equals(
      "page 3 pages equals page 1 pages",
      page3Pagination.pages,
      page1Pagination.pages,
    );
    TestValidator.predicate(
      "page 3 data length not exceeding limit",
      page3Snapshots.length <= limit,
    );

    // Basic per-snapshot checks for page 3
    for (const snapshot of page3Snapshots) {
      TestValidator.equals(
        "snapshot comment_id matches target comment on page 3",
        snapshot.comment_id,
        comment.id,
      );
    }
    for (let i = 1; i < page3Snapshots.length; i++) {
      const prev = page3Snapshots[i - 1];
      const curr = page3Snapshots[i];
      TestValidator.predicate(
        "page 3 created_at ascending",
        prev.created_at <= curr.created_at,
      );
    }
  }
}
