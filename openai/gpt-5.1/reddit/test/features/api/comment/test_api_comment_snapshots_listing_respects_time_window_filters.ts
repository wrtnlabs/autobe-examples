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
 * Validate that comment snapshot listing respects createdFrom/createdTo
 * time-window filters.
 *
 * Business goal:
 *
 * - Ensure that PATCH
 *   /communityPlatform/memberUser/comments/{commentId}/snapshots correctly
 *   applies the createdFrom/createdTo filters when returning
 *   IPageICommunityPlatformCommentSnapshot.ISummary pages.
 * - Confirm that pagination metadata stays consistent with the filtered result
 *   set.
 *
 * Scenario:
 *
 * 1. Platform admin registers and logs in.
 * 2. Platform admin creates a community visibility level and a post type.
 * 3. Member user registers and logs in.
 * 4. Member user creates a community using the created visibility level.
 * 5. Member user creates a post in that community using the created post type.
 * 6. Member user creates a comment under that post.
 * 7. Member user lists snapshots for that comment and uses the returned snapshot
 *    created_at timestamps to build a time window that selects a known subset.
 * 8. Member user calls the snapshot index endpoint with:
 *
 *    - Both createdFrom and createdTo
 *    - Only createdFrom
 *    - Only createdTo and validates that all returned snapshots satisfy the expected
 *         time-window constraints and that pagination.records === data.length.
 */
export async function test_api_comment_snapshots_listing_respects_time_window_filters(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-login via join response)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level
  const visibilityLevelBody = {
    code: `code-${RandomGenerator.alphabets(8)}`,
    name: `Visibility ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);

  // 3. Platform admin creates a post type
  const postTypeBody = {
    code: `type-${RandomGenerator.alphabets(8)}`,
    name: `PostType ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeBody },
    );
  typia.assert(postType);

  // 4. Member user joins and logs in
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedJoin);

  // Explicit login to exercise login flow (even though join already authenticated)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedLogin);

  // 5. Member user creates a community using the visibility level code
  const communityBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: `Community ${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 6. Member user creates a post in the community
  const postBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: `Post ${RandomGenerator.alphabets(10)}`,
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 7. Member user creates a comment under the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
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

  // 8. Initial snapshot listing without filters
  const initialRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortOrder: "asc" as const,
    createdFrom: null,
    createdTo: null,
    includeSystemGenerated: true,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;

  const initialPage: IPageICommunityPlatformCommentSnapshot.ISummary =
    await api.functional.communityPlatform.memberUser.comments.snapshots.index(
      connection,
      {
        commentId: comment.id,
        body: initialRequestBody,
      },
    );
  typia.assert(initialPage);

  const allSnapshots = initialPage.data;

  TestValidator.equals(
    "pagination.records equals data.length on unfiltered snapshot listing",
    allSnapshots.length,
    initialPage.pagination.records,
  );

  if (allSnapshots.length === 0) {
    TestValidator.equals(
      "empty snapshot list should have zero records",
      0,
      initialPage.pagination.records,
    );
    TestValidator.equals(
      "empty snapshot list data length",
      0,
      allSnapshots.length,
    );
    return;
  }

  // Helper to parse created_at into timestamps for range calculations
  const timestamps = allSnapshots.map((s) => new Date(s.created_at).getTime());
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);

  // Construct a mid-range window: between 25% and 75% of the span
  const span = maxTs - minTs;
  const fromTs = span === 0 ? minTs : minTs + Math.floor(span * 0.25);
  const toTs = span === 0 ? maxTs : minTs + Math.floor(span * 0.75);

  const createdFromIso = new Date(fromTs).toISOString();
  const createdToIso = new Date(toTs).toISOString();

  // Compute expected subsets in-memory for different windows
  const expectedWindowBoth = allSnapshots.filter((s) => {
    const t = new Date(s.created_at).getTime();
    return t >= fromTs && t <= toTs;
  });

  const expectedWindowFromOnly = allSnapshots.filter((s) => {
    const t = new Date(s.created_at).getTime();
    return t >= fromTs;
  });

  const expectedWindowToOnly = allSnapshots.filter((s) => {
    const t = new Date(s.created_at).getTime();
    return t <= toTs;
  });

  // 9. Call with both createdFrom and createdTo
  const windowRequestBoth = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortOrder: "asc" as const,
    createdFrom: createdFromIso,
    createdTo: createdToIso,
    includeSystemGenerated: true,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;

  const pageBoth: IPageICommunityPlatformCommentSnapshot.ISummary =
    await api.functional.communityPlatform.memberUser.comments.snapshots.index(
      connection,
      {
        commentId: comment.id,
        body: windowRequestBoth,
      },
    );
  typia.assert(pageBoth);

  TestValidator.equals(
    "both-window: pagination.records equals data.length",
    pageBoth.data.length,
    pageBoth.pagination.records,
  );

  // Business assertion: every returned snapshot is in the expected in-memory subset
  TestValidator.equals(
    "both-window: API returned snapshot IDs match expected subset IDs (order-insensitive)",
    pageBoth.data.map((s) => s.id).sort(),
    expectedWindowBoth.map((s) => s.id).sort(),
  );

  // Additionally, verify each returned created_at falls within [createdFromIso, createdToIso]
  pageBoth.data.forEach((snapshot, index) => {
    const ts = new Date(snapshot.created_at).getTime();
    TestValidator.predicate(
      `both-window: snapshot[${index}] created_at within range`,
      ts >= fromTs && ts <= toTs,
    );
  });

  // 10. Call with only createdFrom
  const windowRequestFromOnly = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortOrder: "asc" as const,
    createdFrom: createdFromIso,
    createdTo: null,
    includeSystemGenerated: true,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;

  const pageFromOnly: IPageICommunityPlatformCommentSnapshot.ISummary =
    await api.functional.communityPlatform.memberUser.comments.snapshots.index(
      connection,
      {
        commentId: comment.id,
        body: windowRequestFromOnly,
      },
    );
  typia.assert(pageFromOnly);

  TestValidator.equals(
    "from-only window: pagination.records equals data.length",
    pageFromOnly.data.length,
    pageFromOnly.pagination.records,
  );

  TestValidator.equals(
    "from-only window: API returned snapshot IDs match expected subset IDs",
    pageFromOnly.data.map((s) => s.id).sort(),
    expectedWindowFromOnly.map((s) => s.id).sort(),
  );

  pageFromOnly.data.forEach((snapshot, index) => {
    const ts = new Date(snapshot.created_at).getTime();
    TestValidator.predicate(
      `from-only window: snapshot[${index}] created_at >= createdFrom`,
      ts >= fromTs,
    );
  });

  // 11. Call with only createdTo
  const windowRequestToOnly = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortOrder: "asc" as const,
    createdFrom: null,
    createdTo: createdToIso,
    includeSystemGenerated: true,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;

  const pageToOnly: IPageICommunityPlatformCommentSnapshot.ISummary =
    await api.functional.communityPlatform.memberUser.comments.snapshots.index(
      connection,
      {
        commentId: comment.id,
        body: windowRequestToOnly,
      },
    );
  typia.assert(pageToOnly);

  TestValidator.equals(
    "to-only window: pagination.records equals data.length",
    pageToOnly.data.length,
    pageToOnly.pagination.records,
  );

  TestValidator.equals(
    "to-only window: API returned snapshot IDs match expected subset IDs",
    pageToOnly.data.map((s) => s.id).sort(),
    expectedWindowToOnly.map((s) => s.id).sort(),
  );

  pageToOnly.data.forEach((snapshot, index) => {
    const ts = new Date(snapshot.created_at).getTime();
    TestValidator.predicate(
      `to-only window: snapshot[${index}] created_at <= createdTo`,
      ts <= toTs,
    );
  });
}
