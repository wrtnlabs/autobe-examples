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
 * Validate that snapshot listing for an unedited comment returns an empty page.
 *
 * Business context:
 *
 * - A platformAdmin configures visibility levels and post types.
 * - A memberUser creates a community, a post, and a single comment.
 * - The comment is never edited, so no comment snapshots should exist.
 *
 * Steps:
 *
 * 1. Register and authenticate as platformAdmin.
 * 2. Create a community visibility level and a post type.
 * 3. Register and authenticate as memberUser.
 * 4. Create a community using the configured visibility level.
 * 5. Create a post in that community using the configured post type.
 * 6. Create a top-level comment on the post (no edits performed).
 * 7. Call the comment snapshot listing endpoint for the comment with a valid
 *    ICommunityPlatformCommentSnapshot.IRequest (page=1, limit>0, sortOrder
 *    set).
 * 8. Verify that the returned page has 0 records, 0 pages, and an empty data
 *    array, confirming that an unedited comment has no snapshots but is handled
 *    gracefully by the API.
 */
export async function test_api_comment_snapshots_listing_for_unedited_comment_returns_empty_page(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as platformAdmin (join is enough to set token)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create post type as platformAdmin
  const postTypeCode = `text-${RandomGenerator.alphabets(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Test PostType",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Register and authenticate as memberUser
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(14),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community as memberUser
  const communityIdentifier = `community-${RandomGenerator.alphabets(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Create a post in the community as memberUser
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Create a top-level comment on the post as memberUser (no edits)
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Business sanity check: comment should be marked as not edited
  TestValidator.predicate(
    "newly created comment is not edited",
    comment.is_edited === false,
  );

  // 8. Call snapshot listing for the unedited comment
  const requestLimit: number & tags.Type<"int32"> & tags.Minimum<1> =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();

  const snapshotRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: requestLimit,
    sortOrder: "desc" as const,
    createdFrom: null,
    createdTo: null,
    includeSystemGenerated: false,
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;

  const snapshotPage: IPageICommunityPlatformCommentSnapshot.ISummary =
    await api.functional.communityPlatform.memberUser.comments.snapshots.index(
      connection,
      {
        commentId: comment.id,
        body: snapshotRequestBody,
      },
    );
  typia.assert(snapshotPage);

  // 9. Validate that the snapshot listing is an empty page
  TestValidator.equals(
    "snapshots listing for unedited comment has zero records",
    snapshotPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "snapshots listing for unedited comment has zero pages",
    snapshotPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "snapshots listing for unedited comment returns empty data array",
    snapshotPage.data.length,
    0,
  );

  // Optional sanity checks on pagination current/limit
  TestValidator.equals(
    "snapshots listing current page is 1",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshots listing page limit matches request",
    snapshotPage.pagination.limit,
    requestLimit,
  );
}
