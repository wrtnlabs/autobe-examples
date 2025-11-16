import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostEditHistory";

/**
 * Validate that an adminUser can list edit history snapshots for a post
 * authored by a memberUser using the administrative listing endpoint.
 *
 * Business flow:
 *
 * 1. Register a new memberUser (join) so we have an author identity.
 * 2. As that memberUser, create a community.
 * 3. As the same memberUser, create a post within that community and capture its
 *    id.
 * 4. Register a new adminUser (join) so we have an administrator identity.
 * 5. Optionally login as that adminUser to validate the login flow and ensure
 *    Authorization header is correctly set for the admin actor.
 * 6. As the authenticated adminUser, call the admin edit history listing endpoint
 *    for the created post with a specific pagination request.
 * 7. Validate response typing and that all history entries (if any) are correctly
 *    scoped to the target post.
 */
export async function test_api_post_edit_history_listing_by_admin(
  connection: api.IConnection,
) {
  // 1. Register memberUser (author)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community as memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a post in that community as memberUser
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 4. Register an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(
    adminAuthorizedFromJoin,
  );

  // 5. Optionally login as the adminUser to validate login flow; this also
  //    ensures Authorization header is bound to the admin actor.
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(
    adminAuthorizedFromLogin,
  );

  // 6. Call the admin editHistory listing endpoint for the created post
  const page = 1 as number & tags.Type<"int32">;
  const limit = 20 as number & tags.Type<"int32">;

  const historyRequestBody = {
    page,
    limit,
  } satisfies ICommunityPlatformPostEditHistory.IRequest;

  const pageResult: IPageICommunityPlatformPostEditHistory.ISummary =
    await api.functional.communityPlatform.adminUser.posts.editHistories.index(
      connection,
      {
        postId: post.id,
        body: historyRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformPostEditHistory.ISummary>(pageResult);

  // 7. Validate pagination metadata
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // Use less-constrained values as the first argument for TestValidator.equals
  TestValidator.equals(
    "pagination current page should match request",
    page,
    pagination.current,
  );
  TestValidator.equals(
    "pagination limit should match request",
    limit,
    pagination.limit,
  );

  // 8. Validate that all histories, if any, belong to the target post
  const histories: ICommunityPlatformPostEditHistory.ISummary[] =
    pageResult.data;

  for (const history of histories) {
    typia.assert<ICommunityPlatformPostEditHistory.ISummary>(history);

    TestValidator.equals(
      "history post_id should equal target post id",
      post.id,
      history.post_id,
    );

    // editor is optional; when present, ensure type correctness via typia
    if (history.editor !== undefined) {
      typia.assert<ICommunityPlatformMemberuser.ISummary>(history.editor);
    }
  }

  // 9. Perform a second call with smaller limit to confirm
  //    data length does not exceed the requested limit.
  const smallerLimit = 5 as number & tags.Type<"int32">;
  const secondaryHistoryRequestBody = {
    page,
    limit: smallerLimit,
  } satisfies ICommunityPlatformPostEditHistory.IRequest;

  const secondPageResult: IPageICommunityPlatformPostEditHistory.ISummary =
    await api.functional.communityPlatform.adminUser.posts.editHistories.index(
      connection,
      {
        postId: post.id,
        body: secondaryHistoryRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformPostEditHistory.ISummary>(
    secondPageResult,
  );

  TestValidator.predicate(
    "second page result size should not exceed requested smaller limit",
    secondPageResult.data.length <= smallerLimit,
  );

  for (const history of secondPageResult.data) {
    typia.assert<ICommunityPlatformPostEditHistory.ISummary>(history);
    TestValidator.equals(
      "second call: history post_id should equal target post id",
      post.id,
      history.post_id,
    );
  }
}
