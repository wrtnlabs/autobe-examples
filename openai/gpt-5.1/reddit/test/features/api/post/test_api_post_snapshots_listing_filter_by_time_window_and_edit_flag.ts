import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";

/**
 * Validate snapshot listing filters by time window and edit flag for a post.
 *
 * Business context: Platform administrators need to inspect the edit history of
 * posts using community_platform_post_snapshots, and must be able to narrow
 * this history by created_at range and is_edited flag for efficient audit and
 * moderation.
 *
 * This E2E test performs a realistic multi-actor flow:
 *
 * 1. Register a platform admin and keep its credentials.
 * 2. As platform admin, create a community visibility level.
 * 3. As platform admin, create a post type.
 * 4. Register a member user and authenticate as that member user.
 * 5. As member user, create a community with the created visibility level.
 * 6. As member user, create a post in that community using the post type.
 * 7. Re-authenticate as platform admin.
 * 8. Call PATCH /communityPlatform/platformAdmin/posts/{postId}/snapshots multiple
 *    times with different ICommunityPlatformPostSnapshot.IRequest filters to
 *    verify:
 *
 *    - Unfiltered listing returns snapshots only for the target post.
 *    - Created_at_from/created_at_to windows constrain results.
 *    - Is_edited=true returns only edited snapshots when such exist.
 *    - Is_edited=false returns only non-edited snapshots when such exist.
 *    - A time window with no matches returns an empty data array with
 *         pagination.records/pages set to 0.
 */
export async function test_api_post_snapshots_listing_filter_by_time_window_and_edit_flag(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and keep credentials
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinInput = {
    username: RandomGenerator.alphabets(12),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. As platform admin, create a community visibility level
  const visibilityCode: string = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreate = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for snapshot E2E tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As platform admin, create a post type
  const postTypeCode: string = `type_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreate = {
    code: postTypeCode,
    name: "Text Post",
    description: "Simple text post type for snapshot E2E tests.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreate,
      },
    );
  typia.assert(postType);

  // 4. Register a member user (join) and keep credentials
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberUsername: string = RandomGenerator.alphabets(10);

  const memberJoinInput = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // Optional explicit login as member user to ensure actor context
  const memberLoginInput = {
    identifier: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberLogin);

  // 5. As member user, create a community with the visibility level
  const communityIdentifier: string = `comm_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreate = {
    identifier: communityIdentifier,
    title: "Snapshot Test Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 6. As member user, create a post in that community using the post type
  const postCreate = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 7. Switch back to platform admin by logging in
  const adminLoginInput = {
    identifier: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogin);

  // 8a. Base snapshot listing without created_at or is_edited filters
  const baseRequest = {
    page: 1,
    limit: 50,
    sort_direction: "asc" as const,
  } satisfies ICommunityPlatformPostSnapshot.IRequest;

  const basePage: IPageICommunityPlatformPostSnapshot.ISummary =
    await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
      connection,
      {
        postId: post.id,
        body: baseRequest,
      },
    );
  typia.assert(basePage);

  const baseSnapshots: ICommunityPlatformPostSnapshot.ISummary[] =
    basePage.data;

  // Validate that all snapshots belong to the correct post
  for (const snapshot of baseSnapshots) {
    TestValidator.equals(
      "snapshot post_id must equal created post id",
      snapshot.post_id,
      post.id,
    );
  }

  // 8b. Time-window filtering when we have enough snapshots
  if (baseSnapshots.length >= 3) {
    const from = baseSnapshots[1].created_at;
    const to = baseSnapshots[baseSnapshots.length - 2].created_at;

    const windowRequest = {
      page: 1,
      limit: 50,
      sort_direction: "asc" as const,
      created_at_from: from,
      created_at_to: to,
    } satisfies ICommunityPlatformPostSnapshot.IRequest;

    const windowPage: IPageICommunityPlatformPostSnapshot.ISummary =
      await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
        connection,
        {
          postId: post.id,
          body: windowRequest,
        },
      );
    typia.assert(windowPage);

    const windowSnapshots = windowPage.data;

    for (const snapshot of windowSnapshots) {
      const created = snapshot.created_at;
      TestValidator.predicate(
        "snapshot created_at must be within middle window",
        created >= from && created <= to,
      );
      TestValidator.equals(
        "window snapshot post_id must equal created post id",
        snapshot.post_id,
        post.id,
      );
    }

    TestValidator.predicate(
      "window pagination records <= base pagination records",
      windowPage.pagination.records <= basePage.pagination.records,
    );
  }

  // 8c. is_edited-based filtering where applicable
  const hasEdited: boolean = baseSnapshots.some((s) => s.is_edited === true);
  const hasUnedited: boolean = baseSnapshots.some((s) => s.is_edited === false);

  if (hasEdited) {
    const editedRequest = {
      page: 1,
      limit: 50,
      sort_direction: "asc" as const,
      is_edited: true,
    } satisfies ICommunityPlatformPostSnapshot.IRequest;

    const editedPage: IPageICommunityPlatformPostSnapshot.ISummary =
      await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
        connection,
        {
          postId: post.id,
          body: editedRequest,
        },
      );
    typia.assert(editedPage);

    for (const snapshot of editedPage.data) {
      TestValidator.predicate(
        "edited filter must return only is_edited=true",
        snapshot.is_edited === true,
      );
      TestValidator.equals(
        "edited snapshot post_id must equal created post id",
        snapshot.post_id,
        post.id,
      );
    }
  }

  if (hasUnedited) {
    const uneditedRequest = {
      page: 1,
      limit: 50,
      sort_direction: "asc" as const,
      is_edited: false,
    } satisfies ICommunityPlatformPostSnapshot.IRequest;

    const uneditedPage: IPageICommunityPlatformPostSnapshot.ISummary =
      await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
        connection,
        {
          postId: post.id,
          body: uneditedRequest,
        },
      );
    typia.assert(uneditedPage);

    for (const snapshot of uneditedPage.data) {
      TestValidator.predicate(
        "unedited filter must return only is_edited=false",
        snapshot.is_edited === false,
      );
      TestValidator.equals(
        "unedited snapshot post_id must equal created post id",
        snapshot.post_id,
        post.id,
      );
    }
  }

  // 8d. Time window that yields no results. If we have at least one snapshot,
  // derive an out-of-range window before the earliest snapshot.
  if (baseSnapshots.length > 0) {
    const earliest = baseSnapshots[0].created_at;
    const earliestDate = new Date(earliest);
    const beforeDate = new Date(earliestDate.getTime() - 24 * 60 * 60 * 1000);
    const beforeIso = beforeDate.toISOString();

    const emptyWindowRequest = {
      page: 1,
      limit: 50,
      sort_direction: "asc" as const,
      created_at_to: beforeIso,
    } satisfies ICommunityPlatformPostSnapshot.IRequest;

    const emptyPage: IPageICommunityPlatformPostSnapshot.ISummary =
      await api.functional.communityPlatform.platformAdmin.posts.snapshots.index(
        connection,
        {
          postId: post.id,
          body: emptyWindowRequest,
        },
      );
    typia.assert(emptyPage);

    TestValidator.equals(
      "empty window should return zero records",
      emptyPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty window should report zero pages",
      emptyPage.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty window should return empty data array",
      emptyPage.data.length,
      0,
    );
  }
}
